import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { roleChecker } from "../middlewares/RoleChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import {
  manageAdminRoleSchema,
  manageUserStatusSchema,
  updateReportSchema,
  adminResolveDisputeSchema,
  adminPaymentInterventionSchema
} from "../validations/adminValidations.js";
import {
  manageAdminRole,
  manageUserStatus,
  getReports,
  getReport,
  assignReport,
  updateReport,
  adminResolveDispute,
  adminPaymentIntervention,
  getUsers,
  getUserDetails,
  getAdminDashboard
} from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require authentication
router.use(jwtVerify);

// SuperAdmin only routes
router.post("/admin/manage-role", roleChecker(["superAdmin"]), validateRequest(manageAdminRoleSchema), manageAdminRole);

// Admin and SuperAdmin routes
router.post("/admin/manage-user-status", roleChecker(["admin", "superAdmin"]), validateRequest(manageUserStatusSchema), manageUserStatus);
router.get("/admin/reports", roleChecker(["admin", "superAdmin"]), getReports);
router.get("/admin/reports/:id", roleChecker(["admin", "superAdmin"]), getReport);
router.post("/admin/reports/:id/assign", roleChecker(["admin", "superAdmin"]), assignReport);
router.patch("/admin/reports/:id", roleChecker(["admin", "superAdmin"]), validateRequest(updateReportSchema), updateReport);
router.post("/admin/exchanges/:id/resolve-dispute", roleChecker(["admin", "superAdmin"]), validateRequest(adminResolveDisputeSchema), adminResolveDispute);
router.post("/admin/payment-intervention", roleChecker(["admin", "superAdmin"]), validateRequest(adminPaymentInterventionSchema), adminPaymentIntervention);
router.get("/admin/users", roleChecker(["admin", "superAdmin"]), getUsers);
router.get("/admin/users/:id", roleChecker(["admin", "superAdmin"]), getUserDetails);
router.get("/admin/dashboard", roleChecker(["admin", "superAdmin"]), getAdminDashboard);

export default router;

