import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import { createReview, getUserReviews, checkUserReviewForExchange } from "../controllers/reviewController.js";
import { createReviewSchema } from "../validations/reviewValidations.js";

const router = express.Router();

router.post("/reviews", jwtVerify, validateRequest(createReviewSchema), createReview);
router.get("/users/:id/reviews", getUserReviews);
router.get("/reviews/check", jwtVerify, checkUserReviewForExchange);

export default router;


