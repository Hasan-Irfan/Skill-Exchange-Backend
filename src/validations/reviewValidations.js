import Joi from "joi";

export const createReviewSchema = Joi.object({
  exchangeId: Joi.string().required(),
  revieweeId: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(2000).allow('')
});


