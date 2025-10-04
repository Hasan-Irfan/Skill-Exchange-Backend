import Joi from "joi";

export const categorySchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  slug: Joi.string().optional(),
  description: Joi.string().optional(),
  icon: Joi.string().optional(),
  order: Joi.number().optional(),
  active: Joi.boolean().default(true),
});

export const skillSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  slug: Joi.string().optional(),
  category: Joi.string().required(),
  synonyms: Joi.array().items(Joi.string()).optional(),
});