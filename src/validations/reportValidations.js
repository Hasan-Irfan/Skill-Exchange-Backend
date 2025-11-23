import Joi from "joi";

export const createReportSchema = Joi.object({
  againstUser: Joi.string().required().messages({
    'string.empty': 'againstUser is required',
    'any.required': 'againstUser is required'
  }),
  exchange: Joi.string().optional(),
  type: Joi.string().valid("abuse", "fraud", "no_show", "quality", "payment", "other").required().messages({
    'any.only': 'type must be one of: abuse, fraud, no_show, quality, payment, other',
    'any.required': 'type is required'
  }),
  description: Joi.string().required().min(10).max(5000).messages({
    'string.empty': 'description is required',
    'string.min': 'description must be at least 10 characters',
    'string.max': 'description must not exceed 5000 characters',
    'any.required': 'description is required'
  }),
  evidence: Joi.array().items(Joi.string()).optional()
});

