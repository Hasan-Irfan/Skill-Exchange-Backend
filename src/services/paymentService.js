import mongoose from "mongoose";
import Payment from "../model/payment.model.js";
import Exchange from "../model/exchange.model.js";
import Listing from "../model/listing.model.js";
import User from "../model/user.model.js";

/**
 * Get payment by ID
 * Only accessible by payer, payee, or admin
 */
export const getPaymentService = async (paymentId, userId, isAdmin = false) => {
  const payment = await Payment.findById(paymentId)
    .populate("payer", "username email avatarUrl")
    .populate("payee", "username email avatarUrl")
    .populate("exchange", "status type")
    .lean();

  if (!payment) throw new Error("Payment not found");

  // Authorization check
  const uid = String(userId);
  const isPayer = payment.payer && String(payment.payer._id || payment.payer) === uid;
  const isPayee = payment.payee && String(payment.payee._id || payment.payee) === uid;

  if (!isPayer && !isPayee && !isAdmin) {
    throw new Error("Unauthorized to view this payment");
  }

  return payment;
};

/**
 * List payments for a user
 * Returns payments where user is payer or payee
 */
export const getUserPaymentsService = async (userId, filters = {}) => {
  const { status, type, limit = 50, skip = 0 } = filters;

  const query = {
    $or: [
      { payer: userId },
      { payee: userId }
    ]
  };

  if (status) query.status = status;
  if (type) query.type = type;

  const payments = await Payment.find(query)
    .populate("payer", "username email avatarUrl")
    .populate("payee", "username email avatarUrl")
    .populate("exchange", "status type")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Payment.countDocuments(query);

  return { payments, total, limit, skip };
};

/**
 * Get payments for an exchange
 * Only accessible by exchange participants
 */
export const getExchangePaymentsService = async (exchangeId, userId, isAdmin = false) => {
  const exchange = await Exchange.findById(exchangeId).lean();
  if (!exchange) throw new Error("Exchange not found");

  // Authorization check
  const uid = String(userId);
  const isParty = String(exchange.initiator) === uid || String(exchange.receiver) === uid;

  if (!isParty && !isAdmin) {
    throw new Error("Unauthorized to view payments for this exchange");
  }

  const payments = await Payment.find({ exchange: exchangeId })
    .populate("payer", "username email avatarUrl")
    .populate("payee", "username email avatarUrl")
    .sort({ createdAt: -1 })
    .lean();

  return payments;
};

/**
 * Create escrow payment for exchange
 * Centralized payment creation with proper payer/payee assignment
 * 
 * @param {string} exchangeId - Exchange ID
 * @param {string} payerId - User ID who pays
 * @param {string} payeeId - User ID who receives (can be null initially)
 * @param {number} amount - Payment amount
 * @param {string} currency - Currency code
 * @param {Object} session - MongoDB session for transactions (required)
 */
export const createEscrowPaymentService = async (exchangeId, payerId, payeeId, amount, currency = "PKR", session) => {
  if (!session) throw new Error("Session is required for payment creation");

  const [payment] = await Payment.create([{
    exchange: exchangeId,
    payer: payerId,
    payee: payeeId || null, // Can be set later when captured
    amount,
    currency,
    type: "escrow",
    status: "escrowed"
  }], { session });

  // Add initial timeline entry
  payment.timeline = [{
    at: new Date(),
    status: "escrowed",
    note: `Escrow payment created for exchange ${exchangeId}`
  }];

  await payment.save({ session });
  return payment.toObject();
};

/**
 * Capture escrow payment upon exchange completion
 * Updates payment status, sets payee, and updates user statistics
 * 
 * @param {string} paymentId - Payment ID to capture
 * @param {string} payeeId - User ID who receives payment
 * @param {string} userId - User ID confirming completion (for audit)
 * @param {Object} session - MongoDB session for transactions (required)
 */
export const captureEscrowPaymentService = async (paymentId, payeeId, userId, session) => {
  if (!session) throw new Error("Session is required for payment capture");

  // Check current payment status (idempotency)
  const existingPayment = await Payment.findById(paymentId).session(session);
  if (!existingPayment) throw new Error("Payment not found");

  if (existingPayment.status === "captured") {
    // Already captured, return early (idempotent)
    return existingPayment.toObject();
  }

  if (existingPayment.status !== "escrowed") {
    throw new Error(`Payment must be escrowed to capture. Current status: ${existingPayment.status}`);
  }

  // Update payment status using updatePaymentStatusService (handles timeline and exchange audit)
  await updatePaymentStatusService(
    paymentId,
    "captured",
    "Payment captured upon exchange completion",
    userId,
    session
  );

  // Set payee
  const updatedPayment = await Payment.findByIdAndUpdate(
    paymentId,
    { payee: payeeId },
    { session, new: true }
  );

  // Update user payment statistics
  if (updatedPayment) {
    // Update payer's totalPaid
    await User.findByIdAndUpdate(
      updatedPayment.payer,
      {
        $inc: {
          "payments.totalPaid": updatedPayment.amount,
          "payments.paidCount": 1
        }
      },
      { session }
    );

    // Update payee's totalReceived
    await User.findByIdAndUpdate(
      payeeId,
      {
        $inc: {
          "payments.totalReceived": updatedPayment.amount,
          "payments.receivedCount": 1
        }
      },
      { session }
    );
  }

  return updatedPayment.toObject();
};

/**
 * Update payment status (for gateway webhooks or admin actions)
 * Adds entry to timeline and exchange audit trail
 * Idempotent: returns early if status is already set to newStatus
 * 
 * @param {string} paymentId - Payment ID to update
 * @param {string} newStatus - New payment status
 * @param {string} note - Note for timeline
 * @param {string} userId - User ID making the change (for audit)
 * @param {Object} session - MongoDB session for transactions (optional)
 */
export const updatePaymentStatusService = async (paymentId, newStatus, note = "", userId = null, session = null) => {
  const validStatuses = ["initiated", "escrowed", "captured", "refunded", "failed", "disputed"];
  if (!validStatuses.includes(newStatus)) {
    throw new Error("Invalid payment status");
  }

  let paymentQuery = Payment.findById(paymentId);
  if (session) paymentQuery = paymentQuery.session(session);
  const payment = await paymentQuery;
  if (!payment) throw new Error("Payment not found");

  const oldStatus = payment.status;

  // Idempotency: if status is already the target status, return early
  if (payment.status === newStatus) {
    return payment.toObject();
  }

  payment.status = newStatus;

  // Add to timeline only if status actually changed
  payment.timeline = payment.timeline || [];
  payment.timeline.push({
    at: new Date(),
    status: newStatus,
    note: note || `Status changed from ${oldStatus} to ${newStatus}`
  });

  await payment.save({ session: session || undefined });

  // Update exchange audit trail if payment is linked to an exchange
  if (payment.exchange) {
    try {
      // Map payment status changes to exchange audit actions
      const auditActionMap = {
        "escrowed": "payment_escrowed",
        "captured": "payment_captured",
        "refunded": "payment_refunded",
        "failed": "payment_failed",
        "disputed": "payment_disputed",
        "initiated": "payment_initiated"
      };

      const auditAction = auditActionMap[newStatus];
      if (auditAction) {
        const auditEntry = {
          at: new Date(),
          by: userId || payment.payer, // Use provided userId or default to payer
          action: auditAction,
          note: note || `Payment status changed to ${newStatus}`
        };

        let exchangeQuery = Exchange.findById(payment.exchange);
        if (session) exchangeQuery = exchangeQuery.session(session);
        const exchange = await exchangeQuery;

        if (exchange) {
          exchange.audit = exchange.audit || [];
          exchange.audit.push(auditEntry);
          await exchange.save({ session: session || undefined });
        }
      }
    } catch (err) {
      // Log error but don't fail the payment status update
      // This ensures payment status is updated even if exchange update fails
      console.error(`Failed to update exchange audit for payment ${paymentId}:`, err.message);
    }
  }

  return payment.toObject();
};

/**
 * Initiate payment for exchange escrow (dummy payment simulation)
 * Creates a payment intent that can be used to fund escrow
 * For FYP: Simulates payment processing
 * 
 * @param {string} exchangeId - Exchange ID
 * @param {string} userId - User ID (payer)
 * @param {number} amount - Payment amount
 * @param {string} currency - Currency code
 * @param {string} gateway - Payment gateway ("stripe", "paypal", "manual")
 */
export const initiateExchangePaymentService = async (exchangeId, userId, amount, currency = "PKR", gateway = "manual") => {
  if (!(Number.isFinite(amount) && amount > 0)) throw new Error("Invalid amount");

  const exchange = await Exchange.findById(exchangeId).lean();
  if (!exchange) throw new Error("Exchange not found");

  // Determine who should pay based on listing type
  const listing = await Listing.findById(exchange.request.listing).lean();
  if (!listing) throw new Error("Request listing not found");

  let expectedPayer;
  if (listing.type === "offer") {
    // Listing owner offers service → initiator pays
    expectedPayer = exchange.initiator;
  } else if (listing.type === "need") {
    // Listing owner needs service → listing owner pays
    expectedPayer = exchange.receiver;
  } else {
    throw new Error("Invalid listing type");
  }

  // Verify user is the correct payer
  if (String(expectedPayer) !== String(userId)) {
    throw new Error(`Only the payer can initiate payment. For ${listing.type} listings, ${listing.type === "offer" ? "initiator" : "listing owner"} must pay.`);
  }

  // Verify exchange is ready for payment
  if (exchange.status !== "agreement_signed") {
    throw new Error("Payment can only be initiated after agreement is signed");
  }

  if (exchange.monetary?.escrowPaymentId) {
    throw new Error("Payment already initiated for this exchange");
  }

  // Validate amount matches totalAmount if set
  if (exchange.monetary?.totalAmount && amount !== exchange.monetary.totalAmount) {
    throw new Error(`Payment amount must be ${exchange.monetary.totalAmount} ${currency}`);
  }

  // Simulate payment processing (dummy)
  // In production, this would:
  // 1. Create payment intent with Stripe/PayPal
  // 2. Return client secret or redirect URL
  // 3. Frontend handles payment confirmation
  // 4. Webhook updates payment status

  const gatewayRef = `gateway_exchange_${exchangeId}_${Date.now()}`;
  const simulatedPaymentId = `sim_${exchangeId}_${Date.now()}`;

  // Return simulated payment response
  return {
    success: true,
    paymentIntent: {
      id: simulatedPaymentId,
      amount,
      currency,
      gateway,
      gatewayRef,
      status: "requires_payment_method", // Simulated status
      clientSecret: gateway === "stripe" ? `sk_test_${gatewayRef}` : null,
      redirectUrl: gateway === "paypal" ? `https://paypal.com/checkout/${gatewayRef}` : null,
      simulated: true // Remove in production
    },
    message: "Payment intent created. Use the clientSecret or redirectUrl to complete payment.",
    nextStep: "Call /exchanges/:id/fund-escrow after payment is confirmed"
  };
};

/**
 * Initiate payment with gateway (Stripe/PayPal)
 * This creates a payment intent/order with the gateway
 * For FYP: Simulates gateway integration
 */
export const initiateGatewayPaymentService = async (paymentId, gateway = "manual") => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error("Payment not found");

  if (payment.status !== "initiated") {
    throw new Error("Payment can only be initiated when status is 'initiated'");
  }

  // Simulate gateway payment creation
  // In production, this would call Stripe/PayPal APIs
  const gatewayRef = `gateway_${paymentId}_${Date.now()}`;

  payment.gateway = gateway;
  payment.gatewayRef = gatewayRef;
  payment.timeline = payment.timeline || [];
  payment.timeline.push({
    at: new Date(),
    status: "initiated",
    note: `Payment initiated with ${gateway} gateway`
  });

  await payment.save();

  // Return gateway response (simulated)
  return {
    payment: payment.toObject(),
    gatewayResponse: {
      gateway,
      gatewayRef,
      clientSecret: gateway === "stripe" ? `sk_test_${gatewayRef}` : null,
      redirectUrl: gateway === "paypal" ? `https://paypal.com/checkout/${gatewayRef}` : null,
      simulated: true // Remove in production
    }
  };
};

/**
 * Handle payment gateway webhook
 * Updates payment status based on gateway events
 * Idempotent: safe to call multiple times with same event
 */
export const handlePaymentWebhookService = async (gateway, event) => {
  const { type, data } = event;

  // Find payment by gateway reference
  const payment = await Payment.findOne({ gateway, gatewayRef: data.gatewayRef || data.paymentId });
  if (!payment) {
    console.warn(`Payment not found for webhook: ${gateway} - ${data.gatewayRef || data.paymentId}`);
    return { received: true, processed: false };
  }

  // Map gateway events to payment statuses
  const statusMap = {
    stripe: {
      "payment_intent.succeeded": "escrowed",
      "payment_intent.payment_failed": "failed",
      "charge.refunded": "refunded"
    },
    paypal: {
      "PAYMENT.CAPTURED": "escrowed",
      "PAYMENT.DENIED": "failed",
      "PAYMENT.REFUNDED": "refunded"
    }
  };

  const newStatus = statusMap[gateway]?.[type];
  if (newStatus) {
    // updatePaymentStatusService is idempotent, so calling it multiple times is safe
    // Note: userId is null for webhooks (system-initiated)
    await updatePaymentStatusService(
      payment._id,
      newStatus,
      `Webhook: ${gateway} - ${type}`,
      null, // userId (null for system/webhook)
      null  // session (no transaction for webhooks)
    );
    return { received: true, processed: true, paymentId: payment._id, status: newStatus };
  }

  // Event type not mapped, but webhook received
  return { received: true, processed: false, paymentId: payment._id, reason: "Event type not mapped" };
};

/**
 * Refund a payment (admin or dispute resolution or exchange cancellation)
 * Updates payment status and adds refund reason
 * 
 * @param {string} paymentId - Payment ID to refund
 * @param {string} refundReason - Reason for refund
 * @param {string} userId - User ID requesting refund (for authorization)
 * @param {boolean} isAdmin - Whether user is admin
 * @param {boolean} allowCancellation - Allow refund during exchange cancellation (bypasses dispute check)
 * @param {Object} session - MongoDB session for transactions (optional)
 */
export const refundPaymentService = async (
    paymentId, 
    refundReason = "", 
    userId = null, 
    isAdmin = false,
    allowCancellation = false,
    session = null
  ) => {
    // Load payment with session when provided
    let pQ = Payment.findById(paymentId);
    if (session) pQ = pQ.session(session);
    const payment = await pQ;
    if (!payment) throw new Error("Payment not found");
  
    // Authorization: Admin, participants in disputed exchanges, or during cancellation
    if (!isAdmin && !allowCancellation) {
      let exchQ = Exchange.findById(payment.exchange);
      if (session) exchQ = exchQ.session(session);
      const exchange = await exchQ.lean();
      if (!exchange || exchange.status !== "disputed") {
        throw new Error("Only admins can refund payments, or participants in disputed exchanges");
      }
      const uid = String(userId);
      const isParty = String(exchange.initiator) === uid || String(exchange.receiver) === uid;
      if (!isParty) throw new Error("Unauthorized");
    }
  
    // Idempotency / allowed states
    if (payment.status === "refunded") return payment.toObject();
    if (!["escrowed", "captured"].includes(payment.status)) {
      throw new Error("Only escrowed or captured payments can be refunded");
    }
  
    // Perform status update using the updated updatePaymentStatusService, passing session
    const updatedPayment = await updatePaymentStatusService(
      paymentId,
      "refunded",
      refundReason || "Payment refunded",
      userId,
      session
    );

    // Update user payment statistics (reverse the payment)
    // Only update if payment was previously captured (had been counted)
    if (payment.status === "captured" && payment.payee) {
      // Decrease payee's totalReceived
      let payeeUpdate = User.findByIdAndUpdate(
        payment.payee,
        {
          $inc: {
            "payments.totalReceived": -payment.amount,
            "payments.receivedCount": -1
          }
        }
      );
      if (session) payeeUpdate = payeeUpdate.session(session);
      await payeeUpdate;

      // Decrease payer's totalPaid
      let payerUpdate = User.findByIdAndUpdate(
        payment.payer,
        {
          $inc: {
            "payments.totalPaid": -payment.amount,
            "payments.paidCount": -1
          }
        }
      );
      if (session) payerUpdate = payerUpdate.session(session);
      await payerUpdate;
    }

    // Also write an exchange audit entry when possible, using the same session
    if (payment.exchange) {
      const auditUpdate = {
        $push: { audit: { at: new Date(), by: userId || null, action: "payment_refunded" } }
      };
      if (session) {
        await Exchange.updateOne({ _id: payment.exchange }, auditUpdate).session(session);
      } else {
        await Exchange.updateOne({ _id: payment.exchange }, auditUpdate);
      }
    }

    return updatedPayment;
  };
