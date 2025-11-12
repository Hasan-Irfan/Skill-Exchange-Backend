import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { roleChecker } from "../middlewares/RoleChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import { createListing, getListing, getListings, updateListing, deleteListing } from "../controllers/listingController.js";
import { listingSchema, listingUpdateSchema } from "../validations/listingValidations.js";

const router = express.Router();

// Public routes - GET requests don't require authentication
router.get("/listings", getListings);
router.get("/listings/:id", getListing);

// Protected routes - POST, PATCH, DELETE require authentication
router.post("/listings", jwtVerify, validateRequest(listingSchema), createListing);
router.patch("/listings/:id", jwtVerify, validateRequest(listingUpdateSchema), updateListing);
router.delete("/listings/:id", jwtVerify, deleteListing);

export default router;
