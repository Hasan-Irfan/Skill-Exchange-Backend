import { asyncHandler } from "../utils/asyncHandler.js";
import { createReviewService, getUserReviewsService } from "../services/reviewService.js";

export const createReview = asyncHandler(async (req, res) => {
  const { exchangeId, revieweeId, rating, comment } = req.body;
  const review = await createReviewService(req.user.id, { exchangeId, revieweeId, rating, comment });
  res.status(201).json({ success: true, data: review });
});

export const getUserReviews = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit, page } = req.query;
  const data = await getUserReviewsService(id, { limit: Number(limit) || 20, page: Number(page) || 1 });
  res.json({ success: true, data });
});


