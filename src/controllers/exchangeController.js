import {
  createExchangeService,
  updateStatusService,
  signAgreementService,
  fundEscrowService,
  startExchangeService,
  confirmCompleteService,
  cancelExchangeService,
  disputeExchangeService,
  resolveDisputeService,
  getExchangeService,
} from "../services/exchangeServices.js";

export const createExchange = async (req, res) => {
  try {
    const exchange = await createExchangeService(req.user.id, req.body);
    res.status(201).json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const acceptExchange = async (req, res) => {
  try {
    const exchange = await updateStatusService(
      req.user,
      req.params.id,
      "accept"
    );
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const declineExchange = async (req, res) => {
  try {
    const exchange = await updateStatusService(
      req.user,
      req.params.id,
      "decline"
    );
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const signAgreement = async (req, res) => {
  try {
    const exchange = await signAgreementService(
      req.user,
      req.params.id,
      req.body
    );
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const fundEscrow = async (req, res) => {
  try {
    const exchange = await fundEscrowService(
      req.user,
      req.params.id,
      req.body.amount
    );
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const startExchange = async (req, res) => {
  try {
    const exchange = await startExchangeService(req.params.id, req.user);
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const confirmComplete = async (req, res) => {
  try {
    const exchange = await confirmCompleteService(req.user, req.params.id);
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const cancelExchange = async (req, res) => {
  try {
    const exchange = await cancelExchangeService(req.user, req.params.id);
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const disputeExchange = async (req, res) => {
  try {
    const exchange = await disputeExchangeService(
      req.user,
      req.params.id,
      req.body.reason
    );
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const resolveDispute = async (req, res) => {
  try {
    const exchange = await resolveDisputeService(
      req.user,
      req.params.id,
      req.body.resolution
    );
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getExchange = async (req, res) => {
  try {
    const exchange = await getExchangeService(req.params.id);
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const getUserExchanges = async (req, res) => {
  try {
    const requestedUserId = req.query.userId;
    const userId = requestedUserId || req.user.id;

    const exchanges = await getExchangeService(null, userId);
    res.json({ success: true, data: exchanges });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
