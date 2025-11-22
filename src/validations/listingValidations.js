import Joi from "joi";

// Joi validation schema for listing creation/update
export const listingSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(1000).required(),
  type: Joi.string().valid("offer", "need").required(),
  category: Joi.array().required(),
  skillsOffered: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
  skillsNeeded: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
  experienceLevel: Joi.string().valid("beginner", "intermediate", "expert").optional(),
  hourlyRate: Joi.number().min(0).optional(),
  availability: Joi.object({
    remote: Joi.boolean().optional(),
    onsite: Joi.boolean().optional(),
    timezone: Joi.string().optional(),
  }).optional(),
  tags: Joi.array().items(Joi.string().min(2).max(30)).optional(),
  active: Joi.boolean().default(true),
});

// Schema for listing updates (all fields optional)
export const listingUpdateSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(1000).optional(),
  type: Joi.string().valid("offer", "need").optional(),
  skillsOffered: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
  skillsNeeded: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
  experienceLevel: Joi.string().valid("beginner", "intermediate", "expert").optional(),
  hourlyRate: Joi.number().min(0).optional(),
  availability: Joi.object({
    remote: Joi.boolean().optional(),
    onsite: Joi.boolean().optional(),
    timezone: Joi.string().optional(),
  }).optional(),
  tags: Joi.array().items(Joi.string().min(2).max(30)).optional(),
  active: Joi.boolean().optional(),
});