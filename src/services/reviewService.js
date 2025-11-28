import mongoose from "mongoose";
import Review from "../model/review.model.js";
import Exchange from "../model/exchange.model.js";
import User from "../model/user.model.js";

const recalcUserRating = async (userId) => {
  const [summary] = await Review.aggregate([
    { $match: { reviewee: new mongoose.Types.ObjectId(String(userId)) } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } }
  ]);
  const avg = summary ? summary.avg : 0;
  const count = summary ? summary.count : 0;
  await User.findByIdAndUpdate(userId, { "rating.avg": avg, "rating.count": count });
};

export const createReviewService = async (reviewerId, { exchangeId, revieweeId, rating, comment }) => {
  const exchange = await Exchange.findById(exchangeId).lean();
  if (!exchange) throw new Error("Exchange not found");

  const participants = [String(exchange.initiator), String(exchange.receiver)];
  if (!participants.includes(String(reviewerId)) || !participants.includes(String(revieweeId))) {
    throw new Error("Users not part of the exchange");
  }

  if (exchange.status !== 'completed') {
    throw new Error("Can only review after completion");
  }

  const existing = await Review.findOne({ exchange: exchangeId, reviewer: reviewerId });
  if (existing) throw new Error("You already reviewed this exchange");

  const review = await Review.create({ exchange: exchangeId, reviewer: reviewerId, reviewee: revieweeId, rating, comment });
  await recalcUserRating(revieweeId);
  return review.toObject();
};

export const getUserReviewsService = async (userId, { limit = 20, page = 1 } = {}) => {
  const skip = (page - 1) * limit;
  const reviews = await Review.find({ reviewee: userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('reviewer', 'username avatarUrl')
    .lean();
  const total = await Review.countDocuments({ reviewee: userId });
  return {
    reviews,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    summary: await User.findById(userId).select("rating").lean().then(user => user?.rating || { avg: 0, count: 0 })
  };
};


