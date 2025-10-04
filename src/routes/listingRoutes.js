import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { roleChecker } from "../middlewares/RoleChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import { createListing, getListing, getListings, updateListing, deleteListing } from "../controllers/listingController.js";
import { listingSchema } from "../validations/listingValidations.js";

const router = express.Router();

router.post("/listings", jwtVerify, validateRequest(listingSchema), createListing);
router.get("/listings", jwtVerify, getListings);
router.get("/listings/:id", jwtVerify, getListing);
router.patch("/listings/:id", jwtVerify, validateRequest(listingSchema), updateListing);
router.delete("/listings/:id", jwtVerify, deleteListing);

export default router;
