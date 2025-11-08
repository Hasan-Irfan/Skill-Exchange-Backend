// services/exchange.service.js
import mongoose from "mongoose";
import Exchange from "../model/exchange.model.js";
import Listing from "../model/listing.model.js";
import Payment from "../model/payment.model.js";
import { Thread } from "../model/thread.model.js";
import { refundPaymentService, updatePaymentStatusService } from "./paymentService.js";

/**
 * Create new exchange request
 * Flow, user clicked a listing, provides offerSkill snapshot
 * payload, { requestListing, offerSkill, notes, type }
 */
export const createExchangeService = async (initiatorId, data) => {
  if (!data?.requestListing) throw new Error("requestListing is required");
  if (!data?.offerSkill?.name) throw new Error("offerSkill is required");

  const session = await mongoose.startSession();
  let out;
  await session.withTransaction(async () => {
    const listing = await Listing.findById(data.requestListing).lean().session(session);
    if (!listing || listing.active === false) throw new Error("Invalid listing");

    const receiverId = String(listing.owner);
    if (receiverId === String(initiatorId)) throw new Error("Cannot propose to yourself");

    const thread = await Thread.create([{ participants: [initiatorId, receiverId] }], { session });

    const requestSnapshot = {
      title: listing.title,
      skillId: listing.skill,
      price: listing.hourlyRate,
      currency: "PKR",
      ownerId: listing.owner,
      visibility: listing.active ? "public" : "inactive",
      version: 1
    };

    const exchange = await Exchange.create([{
      initiator: initiatorId,
      receiver: listing.owner,
      offer: {
        skillSnapshot: {
          skillId: data.offerSkill.skillId,
          name: data.offerSkill.name,
          level: data.offerSkill.level || "intermediate",
          hourlyRate: data.offerSkill.hourlyRate,
          currency: data.offerSkill.currency || "PKR",
          details: data.offerSkill.details
        },
        notes: data.notes
      },
      request: {
        listing: listing._id,
        notes: data.notes,
        listingSnapshot: requestSnapshot
      },
      type: data.type || "barter",
      status: "proposed",
      thread: thread[0]._id,
      audit: [{ at: new Date(), by: initiatorId, action: "created" }]
    }], { session });

    out = exchange[0].toObject();
  });
  session.endSession();
  return out;
};

/**
 * Accept or decline proposal
 * Only receiver, only from proposed
 */
export const updateStatusService = async (user, exchangeId, action) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");

  if (exchange.status !== "proposed") {
    throw new Error("Only proposed exchanges can be accepted or declined");
  }
  if (String(exchange.receiver) !== String(user.id)) {
    throw new Error("Only receiver can respond to proposal");
  }

  if (action === "accept") {
    exchange.status = "accepted_initial";
    exchange.audit.push({ at: new Date(), by: user.id, action: "accepted" });
  } else if (action === "decline") {
    exchange.status = "declined";
    exchange.audit.push({ at: new Date(), by: user.id, action: "declined" });
  } else {
    throw new Error("Invalid action");
  }

  await exchange.save();
  return exchange.toObject();
};

/**
 * Add or sign agreement
 * Only participants, status must be accepted_initial or agreement_signed
 * If terms change, clear signatures and set status back to accepted_initial
 * 
 * Note: For monetary/hybrid exchanges, monetary.totalAmount and monetary.currency
 * should be set when creating the exchange or can be set here via agreementData.monetary
 */
export const signAgreementService = async (user, exchangeId, agreementData = {}) => {
  const session = await mongoose.startSession();
  let out;
  await session.withTransaction(async () => {
    const exchange = await Exchange.findById(exchangeId).session(session);
    if (!exchange) throw new Error("Exchange not found");

    const uid = String(user.id);
    const isParty = [String(exchange.initiator), String(exchange.receiver)].includes(uid);
    if (!isParty) throw new Error("Unauthorized");

    if (!["accepted_initial", "agreement_signed"].includes(exchange.status)) {
      throw new Error("Agreement stage is not active");
    }

    if (!exchange.agreement) exchange.agreement = { terms: [], signedBy: [] };

    // Allow setting monetary fields during agreement (for monetary/hybrid exchanges)
    if (agreementData.monetary && (exchange.type === "monetary" || exchange.type === "hybrid")) {
      if (agreementData.monetary.totalAmount && Number.isFinite(agreementData.monetary.totalAmount) && agreementData.monetary.totalAmount > 0) {
        exchange.monetary = exchange.monetary || {};
        exchange.monetary.totalAmount = agreementData.monetary.totalAmount;
        exchange.audit.push({ at: new Date(), by: user.id, action: "monetary_totalAmount_set" });
      }
      if (agreementData.monetary.currency) {
        exchange.monetary = exchange.monetary || {};
        exchange.monetary.currency = agreementData.monetary.currency;
        exchange.audit.push({ at: new Date(), by: user.id, action: "monetary_currency_set" });
      }
      if (agreementData.monetary.depositPercent != null && Number.isFinite(agreementData.monetary.depositPercent)) {
        exchange.monetary = exchange.monetary || {};
        exchange.monetary.depositPercent = Math.max(0, Math.min(100, agreementData.monetary.depositPercent)); // Clamp between 0-100
        exchange.audit.push({ at: new Date(), by: user.id, action: "monetary_depositPercent_set" });
      }
    }

    if (Array.isArray(agreementData.newTerms) && agreementData.newTerms.length > 0) {
      exchange.agreement.terms.push(...agreementData.newTerms);
      exchange.agreement.signedBy = [];
      exchange.status = "accepted_initial";
      exchange.audit.push({ at: new Date(), by: user.id, action: "terms_updated" });
    }

    if (agreementData.signed === true) {
      const already = (exchange.agreement.signedBy || []).some(id => String(id) === uid);
      if (!already) {
        exchange.agreement.signedBy.push(user.id);
        exchange.audit.push({ at: new Date(), by: user.id, action: "agreement_signed_by_user" });
      }
    }

    const bothSigned = [String(exchange.initiator), String(exchange.receiver)]
      .every(u => (exchange.agreement.signedBy || []).some(id => String(id) === u));

    if (bothSigned) {
      exchange.status = "agreement_signed";
      exchange.audit.push({ at: new Date(), by: user.id, action: "agreement_fully_signed" });
    }

    await exchange.save({ session });
    out = exchange.toObject();
  });
  session.endSession();
  return out;
};

/**
 * Fund escrow
 * Only participants, only after agreement_signed
 * Only for monetary or hybrid exchanges
 * Prevent duplicate funding, validate amount and currency
 */
export const fundEscrowService = async (user, exchangeId, amount, currency = "PKR") => {
  if (!(Number.isFinite(amount) && amount > 0)) throw new Error("Invalid amount");

  const session = await mongoose.startSession();
  let out;
  await session.withTransaction(async () => {
    const exchange = await Exchange.findById(exchangeId).session(session);
    if (!exchange) throw new Error("Exchange not found");

    const uid = String(user.id);
    const isParty = [String(exchange.initiator), String(exchange.receiver)].includes(uid);
    if (!isParty) throw new Error("Not authorized");

    // Escrow only required for monetary or hybrid exchanges
    if (exchange.type === "barter") {
      throw new Error("Escrow is not required for barter exchanges");
    }

    if (exchange.status !== "agreement_signed") {
      throw new Error("Escrow can be funded only after agreement is signed");
    }
    if (exchange.monetary?.escrowPaymentId) throw new Error("Escrow already funded");

    // Currency validation: must match exchange.monetary.currency if set
    const expectedCurrency = exchange.monetary?.currency || "PKR";
    if (currency !== expectedCurrency) {
      throw new Error(`Currency must be ${expectedCurrency}, provided: ${currency}`);
    }

    // Validate and compute expected deposit amount
    if (exchange.monetary?.totalAmount) {
      const depositPercent = exchange.monetary?.depositPercent ?? 10;
      const expected = Math.round((exchange.monetary.totalAmount * depositPercent) / 100);
      if (expected > 0 && amount !== expected) {
        throw new Error(`Deposit must be ${expected} ${currency} (${depositPercent}% of ${exchange.monetary.totalAmount})`);
      }
    } else {
      // If totalAmount is not set, store the amount as depositAmount
      // This allows setting totalAmount later or using amount as the full payment
    }

    // Create payment within transaction
    const [payment] = await Payment.create([{
      exchange: exchange._id,
      payer: user.id,
      payee: null,
      amount,
      currency,
      type: "escrow",
      status: "escrowed"
    }], { session });

    // Atomic update: only update if escrowPaymentId is still null (race condition protection)
    // This ensures that even if two requests come simultaneously, only one will succeed
    const updatedExchange = await Exchange.findOneAndUpdate(
      {
        _id: exchangeId,
        status: "agreement_signed",
        $or: [
          { "monetary.escrowPaymentId": { $exists: false } },
          { "monetary.escrowPaymentId": null }
        ]
      },
      {
        $set: {
          "monetary.currency": currency,
          "monetary.depositAmount": amount,
          "monetary.escrowPaymentId": payment._id,
          status: "escrow_funded"
        },
        $push: {
          audit: { at: new Date(), by: user.id, action: "escrow_funded" }
        }
      },
      { session, new: true }
    );

    if (!updatedExchange) {
      // Another request might have funded the escrow between our check and update
      throw new Error("Escrow already funded or exchange status changed");
    }

    out = updatedExchange.toObject();
  });
  session.endSession();
  return out;
};

/**
 * Start exchange
 * Only participants
 * Business rules:
 * - Barter exchanges: can start after agreement_signed (no escrow required)
 * - Monetary/Hybrid exchanges: require escrow_funded before starting
 */
export const startExchangeService = async ( exchangeId, user) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");

  const uid = String(user.id);
  const isParty = [String(exchange.initiator), String(exchange.receiver)].includes(uid);
  if (!isParty) throw new Error("Not authorized");

  // Check if exchange can be started based on type
  if (exchange.type === "barter") {
    // Barter exchanges can start after agreement is signed (no escrow required)
    if (!["accepted_initial", "agreement_signed"].includes(exchange.status)) {
      throw new Error("Barter exchange can only start after agreement is signed");
    }
  } else {
    // Monetary or hybrid exchanges require escrow to be funded
    if (exchange.status !== "escrow_funded") {
      throw new Error("Monetary or hybrid exchanges require escrow to be funded before starting");
    }
  }

  exchange.status = "in_progress";
  exchange.startedAt = new Date();
  exchange.audit.push({ at: new Date(), by: user.id, action: "started" });

  await exchange.save();
  return exchange.toObject();
};

/**
 * Confirm completion, both users must confirm, release escrow on second confirm
 */
export const confirmCompleteService = async (user, exchangeId) => {
  const session = await mongoose.startSession();
  let out;
  await session.withTransaction(async () => {
    const exchange = await Exchange.findById(exchangeId).session(session);
    if (!exchange) throw new Error("Exchange not found");

    const uid = String(user.id);
    const isInitiator = uid === String(exchange.initiator);
    const isReceiver = uid === String(exchange.receiver);
    if (!isInitiator && !isReceiver) throw new Error("Not authorized");

    if (exchange.status !== "in_progress") {
      // Idempotency: if already completed, return the exchange without changes
      if (exchange.status === "completed") {
        out = exchange.toObject();
        return;
      }
      throw new Error("Can only confirm when in progress");
    }

    const current = exchange.confirmations || { initiator: false, receiver: false };
    
    // Idempotency: track if this confirmation is new
    let isNewConfirmation = false;
    if (isInitiator && !current.initiator) {
      current.initiator = true;
      isNewConfirmation = true;
    }
    if (isReceiver && !current.receiver) {
      current.receiver = true;
      isNewConfirmation = true;
    }
    
    exchange.confirmations = current;

    // Only add audit entry if this is a new confirmation
    if (isNewConfirmation) {
      exchange.audit.push({ at: new Date(), by: user.id, action: "confirmed_completion" });
    }

    if (current.initiator && current.receiver) {
      exchange.status = "completed";
      exchange.completedAt = new Date();
      exchange.audit.push({ at: new Date(), by: user.id, action: "completed" });

      // Idempotent payment capture: use updatePaymentStatusService for consistency
      // This ensures payment timeline and exchange audit are both updated
      if (exchange.monetary?.escrowPaymentId) {
        try {
          // Check current payment status
          const existingPayment = await Payment.findById(exchange.monetary.escrowPaymentId).session(session);
          if (existingPayment) {
            // Only update if payment is still escrowed (idempotency)
            if (existingPayment.status === "escrowed") {
              // Update payment status (will also update exchange audit via updatePaymentStatusService)
              // updatePaymentStatusService is idempotent, so safe to call
              await updatePaymentStatusService(
                exchange.monetary.escrowPaymentId,
                "captured",
                "Payment captured upon exchange completion",
                user.id,
                session
              );
              
              // Set payee separately (updatePaymentStatusService doesn't handle payee assignment)
              await Payment.findByIdAndUpdate(
                exchange.monetary.escrowPaymentId,
                { payee: exchange.receiver },
                { session }
              );
            } else if (existingPayment.status !== "captured") {
              // Payment is in an unexpected state
              console.warn(`Payment ${exchange.monetary.escrowPaymentId} status is ${existingPayment.status}, expected escrowed or captured`);
            }
            // If already captured, skip update (idempotent behavior)
            // Exchange audit would have been updated when payment was first captured
          }
        } catch (err) {
          // Log error but don't fail exchange completion
          // Payment status update failure shouldn't block exchange completion
          console.error(`Failed to capture payment during exchange completion: ${err.message}`);
        }
      }
    }

    await exchange.save({ session });
    out = exchange.toObject();
  });
  session.endSession();
  return out;
};

/**
 * Cancel exchange
 * Only participants, not allowed after in_progress, refund escrow if any
 */
export const cancelExchangeService = async (user, exchangeId) => {
  const session = await mongoose.startSession();
  let out;
  await session.withTransaction(async () => {
    const exchange = await Exchange.findById(exchangeId).session(session);
    if (!exchange) throw new Error("Exchange not found");

    const uid = String(user.id);
    const isParty = [String(exchange.initiator), String(exchange.receiver)].includes(uid);
    if (!isParty) throw new Error("Unauthorized");

    if (["in_progress", "completed"].includes(exchange.status)) {
      throw new Error("Cannot cancel after start");
    }

    // Refund escrow payment if exists (reuse refundPaymentService for consistency)
    if (exchange.monetary?.escrowPaymentId) {
      try {
        await refundPaymentService(
          exchange.monetary.escrowPaymentId,
          "Refunded due to exchange cancellation",
          user.id,
          false, // not admin
          true,  // allowCancellation = true (bypasses dispute check)
          session
        );
      } catch (err) {
        // If payment is already refunded or not in a refundable state, log but don't fail cancellation
        // This handles edge cases where payment might have been refunded separately
        console.warn(`Could not refund payment during cancellation: ${err.message}`);
      }
    }

    exchange.status = "cancelled";
    exchange.audit.push({ at: new Date(), by: user.id, action: "cancelled" });

    await exchange.save({ session });
    out = exchange.toObject();
  });
  session.endSession();
  return out;
};

/**
 * Dispute exchange
 * Only participants, only when in_progress or completed
 */
export const disputeExchangeService = async (user, exchangeId, reason) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");

  const uid = String(user.id);
  const isParty = [String(exchange.initiator), String(exchange.receiver)].includes(uid);
  if (!isParty) throw new Error("Unauthorized");

  if (!["in_progress", "completed"].includes(exchange.status)) {
    throw new Error("Can only dispute ongoing or completed exchanges");
  }

  exchange.status = "disputed";
  exchange.dispute = { raisedBy: user.id, reason, date: new Date() };
  exchange.audit.push({ at: new Date(), by: user.id, action: "disputed" });

  await exchange.save();
  return exchange.toObject();
};

export const resolveDisputeService = async (user, exchangeId, resolution) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");
  if (String(exchange.initiator) !== String(user.id) && String(exchange.receiver) !== String(user.id)) {
    throw new Error("Unauthorized");
  }
  exchange.status = "resolved";
  exchange.audit.push({ at: new Date(), by: user.id, action: "resolved" });
  await exchange.save();
  return exchange.toObject();
};

/**
 * Get exchange details
 * Prefer snapshots for display, still populate live refs when available
 */
export const getExchangeService = async (exchangeId) => {
  const exchange = await Exchange.findById(exchangeId)
    .populate("initiator receiver", "username email avatarUrl")
    .populate("offer.listing", "title type skill hourlyRate")
    .populate("request.listing", "title type skill hourlyRate")
    .populate("thread")
    .populate("monetary.escrowPaymentId")
    .lean();

  if (!exchange) throw new Error("Exchange not found");
  return exchange;
};
