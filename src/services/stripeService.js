import Stripe from "stripe";

// Initialize Stripe with secret key from environment

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20", // or your preferred stable version
  });
  
/**
 * Create or retrieve Stripe customer for user
 */
export const getOrCreateStripeCustomer = async (userId, email, name) => {
  try {
    // Check if user already has a Stripe customer ID
    // This would be stored in user.wallet.stripeCustomerId
    // For now, we'll create a new customer each time (you should store this in user model)
    
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId: String(userId),
      },
    });

    return customer;
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    throw new Error(`Failed to create Stripe customer: ${error.message}`);
  }
};

/**
 * Create Payment Intent for wallet top-up
 */
export const createTopUpPaymentIntent = async (customerId, amount, currency = "USD") => {
  try {
    // Stripe uses lowercase currency codes
    const currencyCode = currency.toLowerCase();
    
    // Convert amount to smallest currency unit
    // For USD: 1 USD = 100 cents
    const amountInSmallestUnit = Math.round(amount * 100);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: currencyCode,
      customer: customerId,
      metadata: {
        type: "wallet_topup",
      },
      description: `Wallet top-up of ${amount} ${currency.toUpperCase()}`,
    });

    return paymentIntent;
  } catch (error) {
    console.error("Error creating Payment Intent:", error);
    throw new Error(`Failed to create payment intent: ${error.message}`);
  }
};

/**
 * Retrieve Payment Intent by ID
 */
export const getPaymentIntent = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error("Error retrieving Payment Intent:", error);
    throw new Error(`Failed to retrieve payment intent: ${error.message}`);
  }
};

/**
 * Confirm Payment Intent (usually done by frontend, but can be used here)
 */
export const confirmPaymentIntent = async (paymentIntentId, paymentMethodId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });
    return paymentIntent;
  } catch (error) {
    console.error("Error confirming Payment Intent:", error);
    throw new Error(`Failed to confirm payment intent: ${error.message}`);
  }
};

/**
 * Verify webhook signature
 */
export const verifyWebhookSignature = (payload, signature, secret) => {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
};

/**
 * Create withdrawal payout (simplified - for FYP, we'll just create a record)
 * In production, you'd use stripe.payouts.create() with bank account details
 */
export const createWithdrawalRequest = async (amount, currency = "usd") => {
  try {
    // For FYP simplicity, we'll just return a withdrawal request object
    // In production, you'd create a Stripe payout here
    const amountInSmallestUnit = Math.round(amount * 100);
    
    // Simulated withdrawal request
    // In real implementation, you'd use:
    // const payout = await stripe.payouts.create({
    //   amount: amountInSmallestUnit,
    //   currency: currency.toLowerCase(),
    //   destination: bankAccountId, // User's bank account
    // });
    
    return {
      id: `withdrawal_${Date.now()}`,
      amount: amountInSmallestUnit,
      currency: currency.toLowerCase(),
      status: "pending", // Will be processed manually or via webhook
      createdAt: new Date(),
    };
  } catch (error) {
    console.error("Error creating withdrawal request:", error);
    throw new Error(`Failed to create withdrawal request: ${error.message}`);
  }
};

export default stripe;

