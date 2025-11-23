import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import { createReportSchema } from "../validations/reportValidations.js";
import {
  createReport,
  getUserReports,
  getReport
} from "../controllers/reportController.js";

const router = express.Router();

// All report routes require authentication
router.use(jwtVerify);

// User report routes
router.post("/reports", validateRequest(createReportSchema), createReport);
router.get("/reports", getUserReports);
router.get("/reports/:id", getReport);

export default router;

