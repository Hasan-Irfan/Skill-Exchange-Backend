import { asyncHandler } from "../utils/asyncHandler.js";
import { sendMessage, getMessages, markRead } from "../services/messageService.js";

export const postMessage = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const { text, attachments } = req.body;
  const msg = await sendMessage(threadId, req.user.id, text, attachments);
  const io = req.app.get('io');
  io.to(String(threadId)).emit('message:new', { threadId, message: msg });
  res.status(201).json({ success: true, data: msg });
});

export const getThreadMessages = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const { limit, before } = req.query;
  const messages = await getMessages(threadId, req.user.id, { limit: Number(limit) || 50, before });
  res.json({ success: true, data: messages });
});

export const readThread = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  await markRead(threadId, req.user.id);
  res.json({ success: true });
});


