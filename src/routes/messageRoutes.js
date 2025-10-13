import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import Joi from "joi";
import { postMessage, getThreadMessages, readThread } from "../controllers/messageController.js";

const router = express.Router();

const messageSchema = Joi.object({
  text: Joi.string().allow('').max(5000),
  attachments: Joi.array().items(Joi.object({ url: Joi.string().uri(), type: Joi.string() })).default([])
});

router.post("/threads/:threadId/messages", jwtVerify, validateRequest(messageSchema), postMessage);
router.get("/threads/:threadId/messages", jwtVerify, getThreadMessages);
router.post("/threads/:threadId/read", jwtVerify, readThread);

export default router;


