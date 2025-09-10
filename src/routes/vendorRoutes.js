// src/routes/vendorRoutes.js
import express from "express";
import { registerVendor, updateVendor, listVendors, getVendor } from "../controllers/vendorController.js";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import { vendorRegisterSchema, vendorUpdateSchema } from "../validations/vendorValidations.js";
import { roleChecker } from "../middlewares/RoleChecker.js";

const router = express.Router();

router.post("/",jwtVerify, validateRequest(vendorRegisterSchema), registerVendor);       // Register vendor
router.put("/:id",jwtVerify, roleChecker(["Admin" , "Vendor"]) , validateRequest(vendorUpdateSchema), updateVendor);       // Update vendor
router.get("/",jwtVerify, roleChecker(["Admin"]) , listVendors);           // List all vendors
router.get("/:id",jwtVerify, roleChecker(["Admin"]) , getVendor);          // Get single vendor

export default router;
