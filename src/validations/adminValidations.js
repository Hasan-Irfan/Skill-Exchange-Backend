import Joi from "joi";

export const manageAdminRoleSchema = Joi.object({
  targetUserId: Joi.string().required().messages({
    'string.empty': 'targetUserId is required',
    'any.required': 'targetUserId is required'
  }),
  action: Joi.string().valid("promote", "demote", "update").required().messages({
    'any.only': 'action must be one of: promote, demote, update',
    'any.required': 'action is required'
  }),
  role: Joi.string().valid("user", "admin").when('action', {
    is: 'update',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

export const manageUserStatusSchema = Joi.object({
  targetUserId: Joi.string().required().messages({
    'string.empty': 'targetUserId is required',
    'any.required': 'targetUserId is required'
  }),
  action: Joi.string().valid("block", "suspend", "unblock", "unsuspend").required().messages({
    'any.only': 'action must be one of: block, suspend, unblock, unsuspend',
    'any.required': 'action is required'
  }),
  reason: Joi.string().optional(),
  duration: Joi.number().positive().when('action', {
    is: 'suspend',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  durationUnit: Joi.string().valid("hours", "days", "weeks", "months").when('action', {
    is: 'suspend',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

export const updateReportSchema = Joi.object({
  status: Joi.string().valid("open", "under_review", "resolved", "rejected", "escalated").optional(),
  priority: Joi.string().valid("low", "medium", "high", "urgent").optional(),
  adminNotes: Joi.string().optional(),
  resolution: Joi.string().optional(),
  actionTaken: Joi.string().valid("none", "warning", "suspend", "block", "refund", "chargeback").optional(),
  evidence: Joi.array().items(Joi.string()).optional(),
  note: Joi.string().optional()
});

export const adminResolveDisputeSchema = Joi.object({
  paymentAction: Joi.string().valid("release", "refund", "split").optional(),
  payeeId: Joi.string().when('paymentAction', {
    is: 'release',
    then: Joi.optional(),
    otherwise: Joi.optional()
  }),
  reason: Joi.string().optional(),
  splitNote: Joi.string().when('paymentAction', {
    is: 'split',
    then: Joi.optional(),
    otherwise: Joi.optional()
  }),
  note: Joi.string().optional()
});

export const adminPaymentInterventionSchema = Joi.object({
  exchangeId: Joi.string().required().messages({
    'string.empty': 'exchangeId is required',
    'any.required': 'exchangeId is required'
  }),
  paymentId: Joi.string().required().messages({
    'string.empty': 'paymentId is required',
    'any.required': 'paymentId is required'
  }),
  action: Joi.string().valid("release", "refund", "hold").required().messages({
    'any.only': 'action must be one of: release, refund, hold',
    'any.required': 'action is required'
  }),
  payeeId: Joi.string().when('action', {
    is: 'release',
    then: Joi.optional(),
    otherwise: Joi.optional()
  }),
  reason: Joi.string().optional()
});

