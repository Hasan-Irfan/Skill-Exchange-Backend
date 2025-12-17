import { verifyWebhookSignature } from "../services/stripeService.js";
import { confirmTopUpService } from "../services/walletService.js";
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
    // Get userId from payment intent metadata
    // Top-ups no longer create Payment records, so we get userId from metadata
    const userId = paymentIntent.metadata?.userId;

    if (!userId) {
      console.warn(`No userId found in metadata for payment intent: ${paymentIntent.id}`);
      // Check if this is a top-up (only process top-ups here)
      if (paymentIntent.metadata?.type !== "wallet_topup") {
        return; // Not a top-up, ignore
      }
      throw new Error("UserId not found in payment intent metadata");
    }

    // Confirm top-up (this will add to user balance directly, no Payment record)
    await confirmTopUpService(paymentIntent.id, userId);
    console.log(`Top-up confirmed for payment intent: ${paymentIntent.id}, userId: ${userId}`);
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
    // Top-ups no longer create Payment records
    // Just log the failure for top-ups
    if (paymentIntent.metadata?.type === "wallet_topup") {
      const userId = paymentIntent.metadata?.userId;
      console.log(`Top-up failed for payment intent: ${paymentIntent.id}, userId: ${userId}, error: ${paymentIntent.last_payment_error?.message || "Unknown error"}`);
      // No Payment record to update, just log
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
    // Top-ups no longer create Payment records
    // Just log the cancellation for top-ups
    if (paymentIntent.metadata?.type === "wallet_topup") {
      const userId = paymentIntent.metadata?.userId;
      console.log(`Top-up canceled for payment intent: ${paymentIntent.id}, userId: ${userId}`);
      // No Payment record to update, just log
    }
  } catch (err) {
    console.error("Error handling payment_intent.canceled:", err);
  }
};

