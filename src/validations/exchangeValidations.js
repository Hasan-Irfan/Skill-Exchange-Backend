import Joi from "joi";
// Validation Schemas
export const createExchangeSchema = Joi.object({
  offerListing: Joi.string().required(),
  requestListing: Joi.string().required(),
});

export const fundSchema = Joi.object({
  amount: Joi.number().positive().required(),
});

export const agreementSchema = Joi.object({
  newTerms: Joi.array().items(Joi.string()).optional(),
  signed: Joi.boolean().optional(),
});

export const disputeSchema = Joi.object({
  reason: Joi.string().required(),
});