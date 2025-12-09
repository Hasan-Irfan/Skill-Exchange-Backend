import mongoose from "mongoose";
import User from "../model/user.model.js";
import Payment from "../model/payment.model.js";
import { getOrCreateStripeCustomer, createTopUpPaymentIntent, getPaymentIntent } from "./stripeService.js";

/**
 * Get user wallet balance
 */
export const getBalanceService = async (userId) => {
  const user = await User.findById(userId).select("wallet").lean();
  if (!user) throw new Error("User not found");
  
  return {
    balance: user.wallet?.balance || 0,
    currency: user.wallet?.currency || "USD",
  };
};

/**
 * Top-up wallet balance using Stripe
 * Step 1: Create Payment Intent
 */
export const initiateTopUpService = async (userId, amount, currency = "USD") => {
  if (!(Number.isFinite(amount) && amount > 0)) {
    throw new Error("Invalid amount");
  }

  const session = await mongoose.startSession();
  let out;
  
  await session.withTransaction(async () => {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    // Get or create Stripe customer
    let stripeCustomerId = user.wallet?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await getOrCreateStripeCustomer(
        user._id,
        user.email,
        user.username
      );
      stripeCustomerId = customer.id;
      
      // Update user with Stripe customer ID
      user.wallet = user.wallet || {};
      user.wallet.stripeCustomerId = stripeCustomerId;
      await user.save({ session });
    }

    // Create Payment Intent
    const paymentIntent = await createTopUpPaymentIntent(
      stripeCustomerId,
      amount,
      currency
    );

    // Create payment record for tracking
    const [payment] = await Payment.create([{
      payer: userId,
      amount,
      currency,
      type: "topup",
      status: "initiated",
      gateway: "stripe",
      gatewayRef: paymentIntent.id,
      timeline: [{
        at: new Date(),
        status: "initiated",
        note: `Top-up initiated: ${amount} ${currency}`
      }]
    }], { session });

    out = {
      paymentId: payment._id,
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount / 100, // Convert back from smallest unit
        currency: paymentIntent.currency.toUpperCase(),
      },
    };
  });
  
  session.endSession();
  return out;
};

/**
 * Confirm top-up after Stripe payment succeeds
 * Called by webhook or after frontend confirms payment
 */
export const confirmTopUpService = async (paymentIntentId, userId) => {
  const session = await mongoose.startSession();
  let out;
  
  await session.withTransaction(async () => {
    // Find payment by gatewayRef (paymentIntentId)
    const payment = await Payment.findOne({
      gatewayRef: paymentIntentId,
      type: "topup"
    }).session(session);

    if (!payment) {
      throw new Error("Top-up payment not found");
    }

    // Idempotency: If already confirmed, return existing result
    if (payment.status === "captured") {
      const user = await User.findById(userId).session(session);
      if (!user) throw new Error("User not found");
      
      out = {
        payment: payment.toObject(),
        newBalance: user.wallet?.balance || 0,
      };
      return;
    }

    // Only process if status is "initiated"
    if (payment.status !== "initiated") {
      throw new Error(`Payment cannot be confirmed. Current status: ${payment.status}`);
    }

    // Verify payment intent status
    const paymentIntent = await getPaymentIntent(paymentIntentId);
    
    if (paymentIntent.status !== "succeeded") {
      throw new Error(`Payment not succeeded. Status: ${paymentIntent.status}`);
    }

    // Verify user matches
    if (String(payment.payer) !== String(userId)) {
      throw new Error("Unauthorized");
    }

    // Update payment status
    payment.status = "captured"; // Using "captured" for successful top-up
    payment.timeline.push({
      at: new Date(),
      status: "captured",
      note: "Top-up completed successfully"
    });
    await payment.save({ session });

    // Add to user balance
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    user.wallet = user.wallet || {};
    user.wallet.balance = (user.wallet.balance || 0) + payment.amount;
    user.wallet.currency = payment.currency;
    user.wallet.lastTopUpAt = new Date();
    await user.save({ session });

    out = {
      payment: payment.toObject(),
      newBalance: user.wallet.balance,
    };
  });
  
  session.endSession();
  return out;
};

/**
 * Deduct balance (for escrow funding)
 * Must be called within a transaction
 */
export const deductBalanceService = async (userId, amount, session) => {
  if (!session) throw new Error("Session required for balance deduction");

  const user = await User.findById(userId).session(session);
  if (!user) throw new Error("User not found");

  user.wallet = user.wallet || {};
  const currentBalance = user.wallet.balance || 0;

  if (currentBalance < amount) {
    throw new Error(`Insufficient balance. Available: ${currentBalance}, Required: ${amount}`);
  }

  user.wallet.balance = currentBalance - amount;
  await user.save({ session });

  return {
    previousBalance: currentBalance,
    newBalance: user.wallet.balance,
    deducted: amount,
  };
};

/**
 * Add balance (for transfers, refunds)
 * Must be called within a transaction
 */
export const addBalanceService = async (userId, amount, currency = "USD", session) => {
    if (!session) throw new Error("Session required for balance addition");
    if (!(Number.isFinite(amount) && amount > 0)) {
      throw new Error("Invalid amount");
    }
  
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");
  
    user.wallet = user.wallet || {};
    const previousBalance = user.wallet.balance || 0;
  
    user.wallet.balance = previousBalance + amount;
    user.wallet.currency = currency;
  
    await user.save({ session });
  
    return {
      previousBalance,
      newBalance: user.wallet.balance,
      added: amount,
    };
  };
/**
 * Request withdrawal
 * For FYP: Creates withdrawal request (can be processed manually by admin)
 */
export const requestWithdrawalService = async (userId, amount, currency = "USD") => {
  if (!(Number.isFinite(amount) && amount > 0)) {
    throw new Error("Invalid amount");
  }

  const session = await mongoose.startSession();
  let out;
  
  await session.withTransaction(async () => {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    user.wallet = user.wallet || {};
    const currentBalance = user.wallet.balance || 0;

    if (currentBalance < amount) {
      throw new Error(`Insufficient balance. Available: ${currentBalance}, Requested: ${amount}`);
    }

    // Create withdrawal payment record
    const [payment] = await Payment.create([{
      payer: userId, // User withdrawing
      amount,
      currency,
      type: "withdrawal",
      status: "initiated",
      gateway: "stripe",
      timeline: [{
        at: new Date(),
        status: "initiated",
        note: `Withdrawal request: ${amount} ${currency}`
      }]
    }], { session });

    // Deduct from balance (will be refunded if withdrawal fails)
    user.wallet.balance = currentBalance - amount;
    user.wallet.lastWithdrawalAt = new Date();
    await user.save({ session });

    out = {
      paymentId: payment._id,
      amount,
      currency,
      status: "pending", // Will be processed manually or via webhook
      newBalance: user.wallet.balance,
    };
  });
  
  session.endSession();
  return out;
};

/**
 * Complete withdrawal (admin action or webhook)
 * For FYP: Mark as completed (in production, this would confirm Stripe payout)
 */
export const completeWithdrawalService = async (paymentId, adminId = null) => {
  const session = await mongoose.startSession();
  let out;
  
  await session.withTransaction(async () => {
    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) throw new Error("Withdrawal payment not found");

    if (payment.type !== "withdrawal") {
      throw new Error("Payment is not a withdrawal");
    }

    if (payment.status === "captured") {
      // Already completed
      return payment.toObject();
    }

    if (payment.status !== "initiated") {
      throw new Error(`Withdrawal cannot be completed. Current status: ${payment.status}`);
    }

    // Update payment status
    payment.status = "captured";
    payment.timeline.push({
      at: new Date(),
      status: "captured",
      note: adminId ? `Withdrawal completed by admin` : "Withdrawal completed"
    });
    await payment.save({ session });

    // Balance already deducted in requestWithdrawalService
    // No need to deduct again

    out = payment.toObject();
  });
  
  session.endSession();
  return out;
};

/**
 * Cancel withdrawal (refund to balance)
 */
export const cancelWithdrawalService = async (paymentId, userId) => {
  const session = await mongoose.startSession();
  let out;
  
  await session.withTransaction(async () => {
    const payment = await Payment.findById(paymentId).session(session);
    if (!payment) throw new Error("Withdrawal payment not found");

    if (String(payment.payer) !== String(userId)) {
      throw new Error("Unauthorized");
    }

    if (payment.type !== "withdrawal") {
      throw new Error("Payment is not a withdrawal");
    }

    if (payment.status === "captured") {
      throw new Error("Cannot cancel completed withdrawal");
    }

    if (payment.status === "refunded") {
      return payment.toObject();
    }

    // Refund to balance
    await addBalanceService(userId, payment.amount, payment.currency, session);

    // Update payment status
    payment.status = "refunded";
    payment.timeline.push({
      at: new Date(),
      status: "refunded",
      note: "Withdrawal cancelled, refunded to balance"
    });
    await payment.save({ session });

    out = payment.toObject();
  });
  
  session.endSession();
  return out;
};

/**
 * Get wallet transaction history
 */
export const getWalletTransactionsService = async (userId, filters = {}) => {
    const { limit = 50, skip = 0, type } = filters;
  
    let orConditions;
  
    if (type) {
      // When a specific type is requested, show any transaction of that type
      // where the user is payer or payee
      orConditions = [
        { payer: userId, type },
        { payee: userId, type },
      ];
    } else {
      // Default view
      orConditions = [
        // Money the user sent or initiated
        { payer: userId, type: { $in: ["topup", "withdrawal", "escrow"] } },
        // Money the user received
        { payee: userId, type: { $in: ["transfer", "escrow"] } },
      ];
    }
  
    const query = { $or: orConditions };
  
    const transactions = await Payment.find(query)
      .populate("exchange", "status type")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  
    const total = await Payment.countDocuments(query);
  
    return { transactions, total, limit, skip };
  };

