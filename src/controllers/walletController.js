import {
  getBalanceService,
  initiateTopUpService,
  confirmTopUpService,
  requestWithdrawalService,
  completeWithdrawalService,
  cancelWithdrawalService,
  getWalletTransactionsService
} from "../services/walletService.js";

/**
 * Get user wallet balance
 */
export const getBalance = async (req, res) => {
  try {
    const balance = await getBalanceService(req.user.id);
    res.json({ success: true, data: balance });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Initiate wallet top-up (creates Stripe Payment Intent)
 */
export const initiateTopUp = async (req, res) => {
  try {
    const { amount, currency = "USD" } = req.body;
    if (!amount || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }
    const result = await initiateTopUpService(req.user.id, amount, currency);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Confirm top-up after payment succeeds
 * Usually called by webhook, but can be called manually
 */
export const confirmTopUp = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: "paymentIntentId is required" });
    }
    const result = await confirmTopUpService(paymentIntentId, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Request withdrawal
 */
export const requestWithdrawal = async (req, res) => {
  try {
    const { amount, currency = "USD" } = req.body;
    if (!amount || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    }
    const result = await requestWithdrawalService(req.user.id, amount, currency);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Complete withdrawal (admin only)
 */
export const completeWithdrawal = async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin" || req.user?.role === "superAdmin";
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    const result = await completeWithdrawalService(req.params.paymentId, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Cancel withdrawal
 */
export const cancelWithdrawal = async (req, res) => {
  try {
    const result = await cancelWithdrawalService(req.params.paymentId, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get wallet transaction history
 */
export const getWalletTransactions = async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0
    };
    const result = await getWalletTransactionsService(req.user.id, filters);
    res.json({ 
      success: true, 
      data: result.transactions, 
      total: result.total, 
      limit: result.limit, 
      skip: result.skip 
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

