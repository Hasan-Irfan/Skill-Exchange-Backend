// services/exchange.service.js
import mongoose from "mongoose";
import Exchange from "../model/exchange.model.js";
import Listing from "../model/listing.model.js";
import { Thread } from "../model/thread.model.js";
import { refundPaymentService, createEscrowPaymentService, captureEscrowPaymentService } from "./paymentService.js";

/**
 * Create new exchange request
 * Flow, user clicked a listing, provides offerSkill snapshot
 * payload, { requestListing, offerSkill, notes, type }
 */
/**
 * Create new exchange request
 * 
 * Flow:
 * 1. PROPOSAL PHASE: Initiator proposes exchange with:
 *    - For "offer" listings: Can send offerSkill (barter) OR monetary (payment) OR both (hybrid)
 *    - For "need" listings: Can send offerSkill (what they provide) and optionally monetary
 * 2. AGREEMENT PHASE: Both parties negotiate and finalize terms (type, amount, etc.)
 * 3. ESCROW PHASE: Payer funds escrow
 * 4. EXECUTION PHASE: Exchange starts and completes
 * 
 * @param {string} initiatorId - User creating the exchange
 * @param {object} data - Exchange proposal data
 * @param {string} data.requestListing - Listing ID the initiator clicked on
 * @param {object} data.offerSkill - Optional: What initiator offers (for barter/hybrid)
 * @param {object} data.monetary - Optional: Monetary proposal (for monetary/hybrid)
 * @param {string} data.type - Optional: Exchange type hint (can be finalized in agreement)
 * @param {string} data.notes - Optional notes
 */
export const createExchangeService = async (initiatorId, data) => {
  if (!data?.requestListing) throw new Error("requestListing is required");
  
  // Either offerSkill or monetary must be provided (or both for hybrid)
  if (!data?.offerSkill && !data?.monetary) {
    throw new Error("Either offerSkill or monetary must be provided");
  }

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

    const exchangeData = {
      initiator: initiatorId,
      receiver: listing.owner,
      offer: {
        // Only include skillSnapshot if offerSkill is provided
        skillSnapshot: data.offerSkill ? {
          skillId: data.offerSkill.skillId,
          name: data.offerSkill.name,
          level: data.offerSkill.level || "intermediate",
          hourlyRate: data.offerSkill.hourlyRate,
          currency: data.offerSkill.currency || "PKR",
          details: data.offerSkill.details
        } : undefined,
        notes: data.notes
      },
      request: {
        listing: listing._id,
        notes: data.notes,
        listingSnapshot: requestSnapshot
      },
      status: "proposed",
      thread: thread[0]._id,
      audit: [{ at: new Date(), by: initiatorId, action: "created" }]
    };

    // Set exchange type if provided (can be finalized in agreement phase)
    if (data.type && ["barter", "monetary", "hybrid"].includes(data.type)) {
      exchangeData.type = data.type;
    } else {
      // Infer type from what's provided
      if (data.offerSkill && data.monetary) {
        exchangeData.type = "hybrid";
      } else if (data.monetary) {
        exchangeData.type = "monetary";
      } else if (data.offerSkill) {
        exchangeData.type = "barter";
      }
    }

    // Set monetary info if provided (can be finalized in agreement phase)
    if ((exchangeData.type === "monetary" || exchangeData.type === "hybrid") && data.monetary) {
      exchangeData.monetary = {
        currency: data.monetary.currency || "PKR",
        totalAmount: data.monetary.totalAmount // Proposal amount (can be negotiated in agreement)
      };
    }

    const [exchange] = await Exchange.create([exchangeData], { session });
    out = exchange.toObject();
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

    if (agreementData.type) {
      if (!["barter", "monetary", "hybrid"].includes(agreementData.type)) {
        throw new Error("Invalid exchange type");
      }
    }

    if (!["accepted_initial", "agreement_signed"].includes(exchange.status)) {
      throw new Error("Agreement stage is not active");
    }

    // Update exchange type if provided
    if (agreementData.type) {
      const prevType = exchange.type;
      exchange.type = agreementData.type;
      if (prevType !== agreementData.type) {
        exchange.audit.push({ at: new Date(), by: user.id, action: "type_set", note: agreementData.type });
      }
    }

    // determine the effective type for this call
    const finalType = exchange.type || agreementData.type;
    if (!finalType) {
      throw new Error("Exchange type must be set (barter, monetary, or hybrid)");
    }

    // If user is attempting to sign now, require monetary details immediately for monetary/hybrid
    if (agreementData.signed === true && (finalType === "monetary" || finalType === "hybrid")) {
      const providedTotal = agreementData.monetary && Number.isFinite(agreementData.monetary.totalAmount) ? agreementData.monetary.totalAmount : null;
      const existingTotal = exchange.monetary && Number.isFinite(exchange.monetary.totalAmount) ? exchange.monetary.totalAmount : null;
      const providedCurrency = agreementData.monetary && agreementData.monetary.currency ? agreementData.monetary.currency : null;
      const existingCurrency = exchange.monetary && exchange.monetary.currency ? exchange.monetary.currency : null;

      if (! (providedTotal || existingTotal) ) {
        throw new Error("totalAmount is required when signing a monetary or hybrid agreement");
      }
      if (! (providedCurrency || existingCurrency) ) {
        throw new Error("currency is required when signing a monetary or hybrid agreement");
      }
    }

    // Handle monetary fields based on exchange type, merge any provided monetary inputs
    if (finalType === "monetary" || finalType === "hybrid") {
      exchange.monetary = exchange.monetary || {};

      if (agreementData.monetary?.totalAmount) {
        if (!Number.isFinite(agreementData.monetary.totalAmount) || agreementData.monetary.totalAmount <= 0) {
          throw new Error("totalAmount must be a positive number");
        }
        exchange.monetary.totalAmount = agreementData.monetary.totalAmount;
        exchange.audit.push({ at: new Date(), by: user.id, action: "monetary_totalAmount_set" });
      }

      if (agreementData.monetary?.currency) {
        exchange.monetary.currency = agreementData.monetary.currency;
        exchange.audit.push({ at: new Date(), by: user.id, action: "monetary_currency_set" });
      }

      // fallback default currency if still missing, keep this optional if you want strict requirement
      if (!exchange.monetary.currency) {
        exchange.monetary.currency = "PKR";
      }
    } else if (finalType === "barter") {
      if (exchange.monetary) {
        exchange.monetary = undefined;
        exchange.audit.push({ at: new Date(), by: user.id, action: "monetary_cleared_for_barter" });
      }
      if (agreementData.monetary) {
        throw new Error("Monetary fields cannot be set for barter exchanges");
      }
    }

    if (!exchange.agreement) exchange.agreement = { terms: [], signedBy: [] };

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
      // final validation before moving to agreement_signed
      const finalTypeNow = exchange.type;
      if (!finalTypeNow) {
        throw new Error("Exchange type not set, please choose barter, monetary, or hybrid before finalizing agreement");
      }

      if (finalTypeNow === "monetary" || finalTypeNow === "hybrid") {
        if (!exchange.monetary || !exchange.monetary.totalAmount || !exchange.monetary.currency) {
          throw new Error("Monetary information is required for monetary or hybrid exchanges. Please set totalAmount and currency.");
        }
        if (!Number.isFinite(exchange.monetary.totalAmount) || exchange.monetary.totalAmount <= 0) {
          throw new Error("totalAmount is required and must be a positive number for monetary or hybrid exchanges");
        }
        if (!exchange.monetary.currency || exchange.monetary.currency.trim() === "") {
          throw new Error("currency is required for monetary or hybrid exchanges");
        }
      } else if (finalTypeNow === "barter") {
        if (exchange.monetary && (exchange.monetary.totalAmount || exchange.monetary.currency)) {
          throw new Error("Monetary fields should not be set for barter exchanges");
        }
      }

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
 * Full payment required (no deposit system)
 * Payment direction: 
 *   - If listing type is "offer": listing owner receives (they provide service)
 *   - If listing type is "need": listing owner receives (they need service, initiator pays)
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

    if (!exchange.type) {
      throw new Error("Exchange type not set, please finalize agreement with a type (barter, monetary, hybrid) before funding or starting");
    }

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

    // Validate full payment amount (no deposit system)
    if (exchange.monetary?.totalAmount) {
      if (amount !== exchange.monetary.totalAmount) {
        throw new Error(`Full payment amount must be ${exchange.monetary.totalAmount} ${currency}`);
      }
    } else {
      // If totalAmount is not set, use the provided amount as totalAmount
      exchange.monetary = exchange.monetary || {};
      exchange.monetary.totalAmount = amount;
    }

    // Determine payment direction based on listing type
    // Load the listing to check its type
    const listing = await Listing.findById(exchange.request.listing).session(session);
    if (!listing) throw new Error("Request listing not found");

    // Payment direction logic:
    // - If listing type is "offer": 
    //   * Listing owner (receiver) is OFFERING a service
    //   * Initiator wants that service
    //   * Initiator PAYS listing owner (receiver) for receiving the service
    //   * payer = initiator, payee = receiver ✅
    //
    // - If listing type is "need":
    //   * Listing owner (receiver) NEEDS a service
    //   * Initiator OFFERS to provide that service
    //   * Listing owner PAYS initiator for the service they receive
    //   * payer = receiver (listing owner), payee = initiator ✅
    let payer, payee;
    if (listing.type === "offer") {
      // Listing owner offers service → initiator pays → listing owner receives
      payer = exchange.initiator;
      payee = exchange.receiver;
    } else if (listing.type === "need") {
      // Listing owner needs service → listing owner pays → initiator receives
      payer = exchange.receiver;
      payee = exchange.initiator;
    } else {
      throw new Error("Invalid listing type");
    }

    // Verify the correct user is funding (must be the payer)
    if (String(user.id) !== String(payer)) {
      throw new Error(`Only the payer can fund the escrow. For ${listing.type} listings, ${listing.type === "offer" ? "initiator" : "listing owner"} must pay.`);
    }

    // Create escrow payment using payment service (centralized logic)
    const payment = await createEscrowPaymentService(
      exchange._id,
      payer,
      payee, // Payee can be set now or later when captured
      amount,
      currency,
      session
    );

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
          "monetary.totalAmount": amount, // Store full payment amount
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
export const startExchangeService = async (exchangeId, user) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");

  const uid = String(user.id);
  const isParty = [String(exchange.initiator), String(exchange.receiver)].includes(uid);
  if (!isParty) throw new Error("Not authorized");

  if (!exchange.type) {
    throw new Error("Exchange type not set, please finalize agreement with a type (barter, monetary, hybrid) before funding or starting");
  }

  // Idempotency: if already in progress or completed, return early
  if (exchange.status === "in_progress" || exchange.status === "completed") {
    throw new Error("Exchange already in progress or completed");
  }

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

      // Capture escrow payment using payment service (centralized logic)
      // This handles payment status update, payee assignment, and user stats
      if (exchange.monetary?.escrowPaymentId) {
        try {
          // Determine correct payee based on listing type
          const listingForPayment = await Listing.findById(exchange.request.listing).session(session);
          let correctPayee;
          if (listingForPayment) {
            if (listingForPayment.type === "offer") {
              // Listing owner offers service → they receive payment
              correctPayee = exchange.receiver;
            } else if (listingForPayment.type === "need") {
              // Listing owner needs service → initiator receives payment
              correctPayee = exchange.initiator;
            } else {
              correctPayee = exchange.receiver; // Fallback
            }
          } else {
            correctPayee = exchange.receiver; // Fallback
          }

          // Capture payment using payment service (handles everything)
          await captureEscrowPaymentService(
            exchange.monetary.escrowPaymentId,
            correctPayee,
            user.id,
            session
          );
        } catch (err) {
          // Log error but don't fail exchange completion
          // Payment capture failure shouldn't block exchange completion
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
