// /src/middlewares/checkExchangeAccess.js
import Exchange from "../model/exchange.model.js";

/**
 * Generic loader: loads exchange and attaches to req.exchange.
 * If not found -> 404.
 */
const loadExchange = async (req, res, next) => {
  try {
    const id = req.params.id || req.body.exchangeId || req.query.exchangeId;
    if (!id) return res.status(400).json({ success: false, message: "Exchange id missing" });

    const exchange = await Exchange.findById(id);
    if (!exchange) return res.status(404).json({ success: false, message: "Exchange not found" });

    req.exchange = exchange;
    next();
  } catch (err) {
    console.error("loadExchange error:", err);
    return res.status(500).json({ success: false, message: "Server error loading exchange" });
  }
};

/**
 * Participant access: initiator OR receiver OR admin
 */
export const checkExchangeAccess = [
  loadExchange,
  (req, res, next) => {
    try {
      const userId = String(req.user?.id);
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const { exchange } = req;
      const isInitiator = String(exchange.initiator) === userId;
      const isReceiver  = String(exchange.receiver)  === userId;
      const isAdmin     = Array.isArray(req.user?.roles) && (req.user.roles.includes("admin") || req.user.roles.includes("superAdmin"));

      if (!isInitiator && !isReceiver && !isAdmin) {
        return res.status(403).json({ success: false, message: "Access denied to this exchange" });
      }

      next();
    } catch (err) {
      console.error("checkExchangeAccess error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
];

/**
 * Receiver-only access: receiver OR admin
 * (Use for accept/decline)
 */
export const checkExchangeReceiver = [
  loadExchange,
  (req, res, next) => {
    try {
      const userId = String(req.user?.id);
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const { exchange } = req;
      const isReceiver = String(exchange.receiver) === userId;
      const isAdmin = Array.isArray(req.user?.roles) && (req.user.roles.includes("admin") || req.user.roles.includes("superAdmin"));

      if (!isReceiver && !isAdmin) {
        return res.status(403).json({ success: false, message: "Only the receiver can perform this action" });
      }

      next();
    } catch (err) {
      console.error("checkExchangeReceiver error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
];

/**
 * Initiator-only access: initiator OR admin
 * (Use for initiator-only actions)
 */
export const checkExchangeInitiator = [
  loadExchange,
  (req, res, next) => {
    try {
      const userId = String(req.user?.id);
      if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

      const { exchange } = req;
      const isInitiator = String(exchange.initiator) === userId;
      const isAdmin = Array.isArray(req.user?.roles) && (req.user.roles.includes("admin") || req.user.roles.includes("superAdmin"));

      if (!isInitiator && !isAdmin) {
        return res.status(403).json({ success: false, message: "Only the initiator can perform this action" });
      }

      next();
    } catch (err) {
      console.error("checkExchangeInitiator error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
];

export default {
  checkExchangeAccess,
  checkExchangeReceiver,
  checkExchangeInitiator
};
