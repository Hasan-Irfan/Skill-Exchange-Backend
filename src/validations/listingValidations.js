import Joi from "joi";
// Joi validation schema for listing creation/update
export const listingSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(1000).required(),
  type: Joi.string().valid("offer", "need").required(),
  skill: Joi.string().required(),
  priceRange: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(Joi.ref("min")),
    currency: Joi.string().default("PKR"),
  }),
  availability: Joi.object({
    timezone: Joi.string(),
    slots: Joi.array().items(
      Joi.object({
        dayOfWeek: Joi.number().min(0).max(6),
        from: Joi.string(),
        to: Joi.string(),
      })
    ),
  }),
  location: Joi.object({
    city: Joi.string(),
    country: Joi.string(),
  }),
  attachments: Joi.array().items(Joi.string().uri()).optional(),
  active: Joi.boolean().default(true),
});