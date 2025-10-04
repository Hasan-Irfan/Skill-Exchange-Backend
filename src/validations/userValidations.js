import Joi from "joi";

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  bio: Joi.string().max(1000),
  avatarUrl: Joi.string().uri(),
  skillsOffered: Joi.array().items(Joi.string()),
  skillsNeeded: Joi.array().items(Joi.string()),
  location: Joi.object({
    country: Joi.string(),
    city: Joi.string(),
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
  portfolioLinks: Joi.array().items(
    Joi.object({
      label: Joi.string(),
      url: Joi.string().uri(),
    })
  ),
  notificationPrefs: Joi.object({
    email: Joi.boolean(),
    sms: Joi.boolean(),
    push: Joi.boolean(),
  }),
});