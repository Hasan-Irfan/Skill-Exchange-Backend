// src/routes/inventoryRoutes.js
import express from "express";
import { updateStock, adjustStock } from "../controllers/inventoryController.js";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { roleChecker } from "../middlewares/RoleChecker.js";

const router = express.Router();

// PUT /api/inventory/:productId/set   (set stock directly)
router.put("/:productId/set", jwtVerify , roleChecker(["Vendor"]) ,updateStock);

// PUT /api/inventory/:productId/adjust  (increase/decrease stock)
router.put("/:productId/adjust", jwtVerify , roleChecker(["Vendor"]) ,adjustStock);

export default router;
