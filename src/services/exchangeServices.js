import Exchange from "../model/exchange.model.js";
import Listing from "../model/listing.model.js";
import Payment from "../model/payment.model.js";
import { Thread } from "../model/thread.model.js";
import User from "../model/user.model.js";

/**
 * Create new exchange request
 */
export const createExchangeService = async (initiatorId, data) => {
  const offerListing = await Listing.findById(data.offerListing);
  const requestListing = await Listing.findById(data.requestListing);
  if (!offerListing || !requestListing) throw new Error("Invalid listing(s)");

  const receiverId = requestListing.owner;

  const thread = await Thread.create({
    participants: [initiatorId, receiverId],
  });

  const exchange = await Exchange.create({
    initiator: initiatorId,
    receiver: receiverId,
    offer: { listing: offerListing._id },
    request: { listing: requestListing._id },
    status: "proposed",
    thread: thread._id,
  });

  return exchange.toObject();
};

/**
 * Accept or decline proposal
 */
export const updateStatusService = async (user, exchangeId, action) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");

  if (exchange.receiver.toString() !== user.id)
    throw new Error("Only receiver can respond to proposal");

  if (action === "accept") {
    exchange.status = "accepted_initial";
  } else if (action === "decline") {
    exchange.status = "declined";
  }

  await exchange.save();
  return exchange.toObject();
};

/**
 * Add or sign agreement
 */
export const signAgreementService = async (user, exchangeId, agreementData) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");

  const isInitiator = user.id === exchange.initiator.toString();
  const isReceiver = user.id === exchange.receiver.toString();
  if (!isInitiator && !isReceiver) throw new Error("Unauthorized");

  if (!exchange.agreement) exchange.agreement = { terms: [], signedBy: [] };
  if (agreementData.newTerms) {
    exchange.agreement.terms.push(...agreementData.newTerms);
  }

  if (agreementData.signed === true) {
    const userId = user.id;
    const already = (exchange.agreement.signedBy || []).some((id) => String(id) === String(userId));
    if (!already) exchange.agreement.signedBy.push(userId);
  }

  // if both signed, move to next stage
  const bothSigned = [exchange.initiator.toString(), exchange.receiver.toString()]
    .every((uid) => (exchange.agreement.signedBy || []).some((id) => String(id) === String(uid)));
  if (bothSigned) exchange.status = "agreement_signed";

  await exchange.save();
  return exchange.toObject();
};

/**
 * Fund escrow / deposit insurance
 */
export const fundEscrowService = async (user, exchangeId, amount) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");

  if (![exchange.initiator.toString(), exchange.receiver.toString()].includes(user.id))
    throw new Error("Not authorized");

  const payment = await Payment.create({
    exchange: exchange._id,
    payer: user.id,
    payee: null,
    amount,
    type: "escrow",
    status: "escrowed",
  });

  exchange.monetary = {
    ...(exchange.monetary || {}),
    depositAmount: amount,
    escrowPaymentId: payment._id,
  };
  exchange.status = "escrow_funded";

  await exchange.save();
  return exchange.toObject();
};

/**
 * Start exchange officially
 */
export const startExchangeService = async (exchangeId, user) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");

  if (exchange.status !== "escrow_funded")
    throw new Error("Cannot start exchange yet");

  exchange.status = "in_progress";
  exchange.startedAt = new Date();

  await exchange.save();
  return exchange.toObject();
};

/**
 * Confirm completion (both users must confirm)
 */
export const confirmCompleteService = async (user, exchangeId) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");

  if (user.id === exchange.initiator.toString()) {
    exchange.confirmations = { ...exchange.confirmations, initiator: true };
  } else if (user.id === exchange.receiver.toString()) {
    exchange.confirmations = { ...exchange.confirmations, receiver: true };
  } else {
    throw new Error("Not authorized");
  }

  if (exchange.confirmations.initiator && exchange.confirmations.receiver) {
    exchange.status = "completed";
    exchange.completedAt = new Date();

    // Release escrow if any
    if (exchange.monetary?.escrowPaymentId) {
      await Payment.findByIdAndUpdate(exchange.monetary.escrowPaymentId, {
        status: "captured",
      });
    }
  }

  await exchange.save();
  return exchange.toObject();
};

/**
 * Cancel exchange
 */
export const cancelExchangeService = async (user, exchangeId) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");

  if (![exchange.initiator.toString(), exchange.receiver.toString()].includes(user.id))
    throw new Error("Unauthorized");

  if (exchange.status === "completed") throw new Error("Cannot cancel completed exchange");

  exchange.status = "cancelled";
  await exchange.save();
  return exchange.toObject();
};

/**
 * Dispute exchange
 */
export const disputeExchangeService = async (user, exchangeId, reason) => {
  const exchange = await Exchange.findById(exchangeId);
  if (!exchange) throw new Error("Exchange not found");

  exchange.status = "disputed";
  exchange.dispute = {
    raisedBy: user.id,
    reason,
    date: new Date(),
  };

  await exchange.save();
  return exchange.toObject();
};

/**
 * Get exchange details
 */
export const getExchangeService = async (exchangeId) => {
  const exchange = await Exchange.findById(exchangeId)
    .populate("initiator receiver", "username email avatarUrl")
    .populate("offer.listing request.listing", "title type")
    .populate("thread")
    .populate("monetary.escrowPaymentId")
    .lean();

  if (!exchange) throw new Error("Exchange not found");
  return exchange;
};
