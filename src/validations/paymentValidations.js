import Joi from "joi";

/**
 * Validation schema for initiating gateway payment
 */
export const initiateGatewayPaymentSchema = Joi.object({
  gateway: Joi.string().valid("stripe", "paypal", "manual").default("manual")
});

/**
 * Validation schema for updating payment status (admin)
 */
export const updatePaymentStatusSchema = Joi.object({
  status: Joi.string().valid("initiated", "escrowed", "captured", "refunded", "failed", "disputed").required(),
  note: Joi.string().max(500).optional()
});

/**
 * Validation schema for refund payment
 */
export const refundPaymentSchema = Joi.object({
  reason: Joi.string().max(500).optional()
});

/**
 * Validation schema for payment webhook
 */
export const paymentWebhookSchema = Joi.object({
  type: Joi.string().required(),
  data: Joi.object({
    gatewayRef: Joi.string().optional(),
    paymentId: Joi.string().optional(),
    amount: Joi.number().optional(),
    currency: Joi.string().optional()
  }).required()
});

/**
 * Query validation schema for getUserPayments
 */
export const getUserPaymentsQuerySchema = Joi.object({
  status: Joi.string().valid("initiated", "escrowed", "captured", "refunded", "failed", "disputed").optional(),
  type: Joi.string().valid("deposit", "escrow", "final_payment", "refund").optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  skip: Joi.number().integer().min(0).optional()
});

