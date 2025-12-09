import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import {
  getBalance,
  initiateTopUp,
  confirmTopUp,
  requestWithdrawal,
  completeWithdrawal,
  cancelWithdrawal,
  getWalletTransactions
} from "../controllers/walletController.js";
import { handleStripeWebhook, stripeWebhookMiddleware } from "../controllers/stripeWebhookController.js";

const router = express.Router();

// All routes require authentication
router.use(jwtVerify);

// Get wallet balance
router.get("/balance", getBalance);

// Top-up wallet
router.post("/topup", initiateTopUp);
router.post("/topup/confirm", confirmTopUp);

// Withdrawal
router.post("/withdraw", requestWithdrawal);
router.post("/withdraw/:paymentId/cancel", cancelWithdrawal);

// Admin: Complete withdrawal
router.post("/withdraw/:paymentId/complete", (req, res, next) => {
  const isAdmin = req.user?.role === "admin" || req.user?.role === "superAdmin";
  if (!isAdmin) {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
}, completeWithdrawal);

// Get transaction history
router.get("/transactions", getWalletTransactions);

// Stripe webhook (no auth, uses signature verification)
router.post("/webhooks/stripe", stripeWebhookMiddleware, handleStripeWebhook);

export default router;

