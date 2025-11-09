import Joi from "joi";
// Validation Schemas
export const createExchangeSchema = Joi.object({
  requestListing: Joi.string().required().messages({
    'string.empty': 'requestListing is required',
    'any.required': 'requestListing is required'
  }),
  // offerSkill is optional - can propose with skill (barter) or monetary payment
  offerSkill: Joi.object({
    skillId: Joi.string().optional(),
    name: Joi.string().required().messages({
      'string.empty': 'offerSkill.name is required',
      'any.required': 'offerSkill.name is required'
    }),
    level: Joi.string().valid("beginner", "intermediate", "expert").optional(),
    hourlyRate: Joi.number().min(0).optional(),
    currency: Joi.string().optional(),
    details: Joi.string().optional()
  }).optional().messages({
    'object.base': 'offerSkill must be an object'
  }),
  // Monetary info can be sent instead of or with offerSkill
  monetary: Joi.object({
    totalAmount: Joi.number().positive().optional(),
    currency: Joi.string().min(2).max(10).optional()
  }).optional(),
  notes: Joi.string().optional(),
  type: Joi.string().valid("barter", "monetary", "hybrid").optional()
}).or('offerSkill', 'monetary').messages({
  'object.missing': 'Either offerSkill or monetary must be provided'
});

export const fundSchema = Joi.object({
  amount: Joi.number().positive().required(),
});

export const agreementSchema = Joi.object({
  newTerms: Joi.array().items(Joi.string()).optional(),
  signed: Joi.boolean().optional(),
  type: Joi.string().valid("barter", "monetary", "hybrid").optional(),
  monetary: Joi.object({
    totalAmount: Joi.number().positive().optional(),
    currency: Joi.string().min(2).max(10).optional()
  }).optional()
});

export const disputeSchema = Joi.object({
  reason: Joi.string().required(),
});