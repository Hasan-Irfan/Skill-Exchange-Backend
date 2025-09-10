// src/routes/orderRoutes.js
import express from "express";
import { placeOrder, listOrders, getOrder, updateOrderStatus } from "../controllers/orderController.js";
import { validate } from "../middlewares/validate.js";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { orderCreateSchema, orderStatusSchema } from "../validations/orderValidations.js";
import { roleChecker } from "../middlewares/RoleChecker.js";

const router = express.Router();

router.post("/", jwtVerify , validate(orderCreateSchema), roleChecker(["Customer" , "B2B_Customer"]), placeOrder);      // Place order
router.get("/", jwtVerify , roleChecker(["Admin" , "Vendor"]) , listOrders);                                   // List all
router.get("/:id", jwtVerify , roleChecker(["Admin" , "Vendor"]) , getOrder);                                  // Get single
router.put("/:id/status", jwtVerify , validate(orderStatusSchema), roleChecker(["Vendor"]) , updateOrderStatus); // Update status

export default router;
