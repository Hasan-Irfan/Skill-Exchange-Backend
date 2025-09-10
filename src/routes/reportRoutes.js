// src/routes/reportRoutes.js
import express from "express";
import {
  getSalesByVendor,
  getTopProducts,
  getRevenueBreakdown,
  getLowStock,
  getCustomerHistory
} from "../controllers/reportController.js";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { roleChecker } from "../middlewares/RoleChecker.js";

const router = express.Router();

router.get("/sales-by-vendor", jwtVerify , roleChecker(["Admin"]) , getSalesByVendor);
router.get("/top-products", jwtVerify , roleChecker(["Admin"]) , getTopProducts);
router.get("/revenue-breakdown", jwtVerify , roleChecker(["Admin"]) , getRevenueBreakdown);
router.get("/low-stock", jwtVerify , roleChecker(["Admin" , "Vendor"]) , getLowStock);
router.get("/customer-history/:customerId", jwtVerify , roleChecker(["Admin" , "Customer"]) , getCustomerHistory);

export default router;
