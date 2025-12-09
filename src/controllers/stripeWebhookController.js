import { verifyWebhookSignature } from "../services/stripeService.js";
import { confirmTopUpService } from "../services/walletService.js";
import Payment from "../model/payment.model.js";
import express from "express";

// Stripe requires raw body for webhook signature verification
export const stripeWebhookMiddleware = express.raw({ type: "application/json" });

/**
 * Handle Stripe webhook events
 * This endpoint should be configured in Stripe dashboard
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;

  try {
    // Verify webhook signature
    event = verifyWebhookSignature(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;

      case "payment_intent.canceled":
        await handlePaymentIntentCanceled(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (err) {
    console.error("Error handling webhook:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
};

/**
 * Handle successful payment intent (top-up completed)
 */
const handlePaymentIntentSucceeded = async (paymentIntent) => {
  try {
    // Find payment by gatewayRef (paymentIntent.id)
    // The paymentIntent.metadata should contain userId if we set it
    // For now, we'll find by gatewayRef
    
    // Call confirmTopUpService
    // Note: We need to find the userId from the payment record
    const payment = await Payment.findOne({
      gatewayRef: paymentIntent.id,
      type: "topup",
      status: "initiated"
    });

    if (!payment) {
      console.warn(`Payment not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    // Confirm top-up (this will add to user balance)
    await confirmTopUpService(paymentIntent.id, payment.payer);
    console.log(`Top-up confirmed for payment intent: ${paymentIntent.id}`);
  } catch (err) {
    console.error("Error handling payment_intent.succeeded:", err);
    throw err;
  }
};

/**
 * Handle failed payment intent
 */
const handlePaymentIntentFailed = async (paymentIntent) => {
  try {
    const payment = await Payment.findOne({
      gatewayRef: paymentIntent.id,
      type: "topup"
    });

    if (payment && payment.status === "initiated") {
      payment.status = "failed";
      payment.timeline.push({
        at: new Date(),
        status: "failed",
        note: `Payment failed: ${paymentIntent.last_payment_error?.message || "Unknown error"}`
      });
      await payment.save();
      console.log(`Top-up failed for payment intent: ${paymentIntent.id}`);
    }
  } catch (err) {
    console.error("Error handling payment_intent.payment_failed:", err);
  }
};

/**
 * Handle canceled payment intent
 */
const handlePaymentIntentCanceled = async (paymentIntent) => {
  try {
    const payment = await Payment.findOne({
      gatewayRef: paymentIntent.id,
      type: "topup"
    });

    if (payment && payment.status === "initiated") {
      payment.status = "failed";
      payment.timeline.push({
        at: new Date(),
        status: "failed",
        note: "Payment canceled"
      });
      await payment.save();
      console.log(`Top-up canceled for payment intent: ${paymentIntent.id}`);
    }
  } catch (err) {
    console.error("Error handling payment_intent.canceled:", err);
  }
};

