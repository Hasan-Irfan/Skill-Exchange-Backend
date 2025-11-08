import {
  getPaymentService,
  getUserPaymentsService,
  getExchangePaymentsService,
  updatePaymentStatusService,
  initiateGatewayPaymentService,
  handlePaymentWebhookService,
  refundPaymentService
} from "../services/paymentService.js";

/**
 * Get payment by ID
 */
export const getPayment = async (req, res) => {
  try {
    const isAdmin = req.user?.roles?.includes("admin") || false;
    const payment = await getPaymentService(req.params.id, req.user.id, isAdmin);
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

/**
 * Get user's payments
 */
export const getUserPayments = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      type: req.query.type,
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0
    };
    const result = await getUserPaymentsService(req.user.id, filters);
    res.json({ success: true, data: result.payments, total: result.total, limit: result.limit, skip: result.skip });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get payments for an exchange
 */
export const getExchangePayments = async (req, res) => {
  try {
    const isAdmin = req.user?.roles?.includes("admin") || false;
    const payments = await getExchangePaymentsService(req.params.exchangeId, req.user.id, isAdmin);
    res.json({ success: true, data: payments });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Initiate gateway payment
 */
export const initiateGatewayPayment = async (req, res) => {
  try {
    const { gateway = "manual" } = req.body;
    const result = await initiateGatewayPaymentService(req.params.id, gateway);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Update payment status (admin or webhook)
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const isAdmin = req.user?.roles?.includes("admin") || false;
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { status, note } = req.body;
    // Pass userId for audit trail, no session needed (not in transaction)
    const payment = await updatePaymentStatusService(req.params.id, status, note, req.user.id, null);
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Handle payment webhook
 */
export const handlePaymentWebhook = async (req, res) => {
  try {
    const gateway = req.params.gateway; // stripe or paypal
    const event = req.body;
    
    const result = await handlePaymentWebhookService(gateway, event);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Refund payment
 */
export const refundPayment = async (req, res) => {
  try {
    const isAdmin = req.user?.roles?.includes("admin") || false;
    const { reason } = req.body;
    const payment = await refundPaymentService(req.params.id, reason, req.user.id, isAdmin);
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

