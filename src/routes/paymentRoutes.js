import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  initiateGatewayPaymentSchema,
  updatePaymentStatusSchema,
  refundPaymentSchema,
  paymentWebhookSchema,
  getUserPaymentsQuerySchema
} from "../validations/paymentValidations.js";
import {
  getPayment,
  getUserPayments,
  getExchangePayments,
  initiateGatewayPayment,
  updatePaymentStatus,
  handlePaymentWebhook,
  refundPayment
} from "../controllers/paymentController.js";

const router = express.Router();

// Middleware to check admin access
const checkAdmin = (req, res, next) => {
  const isAdmin = req.user?.roles?.includes("admin") || false;
  if (!isAdmin) {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
};

// Routes
// Get payment by ID
router.get("/payments/:id", jwtVerify, getPayment);

// Get user's payments
router.get("/payments", jwtVerify, validateRequest(getUserPaymentsQuerySchema, "query"), getUserPayments);

// Get payments for an exchange
router.get("/exchanges/:exchangeId/payments", jwtVerify, getExchangePayments);

// Initiate gateway payment
router.post("/payments/:id/initiate", jwtVerify, validateRequest(initiateGatewayPaymentSchema), initiateGatewayPayment);

// Update payment status (admin only)
router.patch("/payments/:id/status", jwtVerify, checkAdmin, validateRequest(updatePaymentStatusSchema), updatePaymentStatus);

// Refund payment
router.post("/payments/:id/refund", jwtVerify, validateRequest(refundPaymentSchema), refundPayment);

// Webhook endpoints (no auth required, but should be secured with gateway signature verification in production)
router.post("/webhooks/payments/:gateway", handlePaymentWebhook);

export default router;

