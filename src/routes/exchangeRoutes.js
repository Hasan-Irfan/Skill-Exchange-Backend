import express from "express";
import { createExchangeSchema, agreementSchema, fundSchema, disputeSchema } from "../validations/exchangeValidations.js";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { checkExchangeAccess , checkExchangeReceiver } from "../middlewares/exchangeMiddlewares.js";
import { validateRequest } from "../middlewares/validate.js";
import { createExchange , acceptExchange , declineExchange , signAgreement , fundEscrow , startExchange , confirmComplete , cancelExchange , disputeExchange, resolveDispute , getExchange , getUserExchanges } from "../controllers/exchangeController.js";

const router = express.Router();

// Routes
router.post("/exchanges", jwtVerify, validateRequest(createExchangeSchema), createExchange);
router.post("/exchanges/:id/accept", jwtVerify, checkExchangeReceiver, acceptExchange);
router.post("/exchanges/:id/decline", jwtVerify, checkExchangeReceiver, declineExchange);
router.post("/exchanges/:id/sign-agreement", jwtVerify, checkExchangeAccess, validateRequest(agreementSchema), signAgreement);
router.post("/exchanges/:id/fund-escrow", jwtVerify, checkExchangeAccess, validateRequest(fundSchema), fundEscrow);
router.post("/exchanges/:id/start", jwtVerify, checkExchangeAccess, startExchange);
router.post("/exchanges/:id/confirm-complete", jwtVerify, checkExchangeAccess, confirmComplete);
router.post("/exchanges/:id/cancel", jwtVerify, checkExchangeAccess, cancelExchange);
router.post("/exchanges/:id/dispute", jwtVerify, checkExchangeAccess, validateRequest(disputeSchema), disputeExchange);
router.post("/exchanges/:id/resolve-dispute", jwtVerify, checkExchangeAccess, resolveDispute);
router.get("/exchanges/:id", jwtVerify, checkExchangeAccess, getExchange);
router.get("/exchanges", jwtVerify, getUserExchanges);

export default router;
