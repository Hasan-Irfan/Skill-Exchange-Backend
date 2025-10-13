import { Thread } from "../model/thread.model.js";
import { Message } from "../model/message.model.js";

export const ensureThreadAccess = async (threadId, userId) => {
  const thread = await Thread.findById(threadId).lean();
  if (!thread) throw new Error("Thread not found");
  const isParticipant = thread.participants.some((p) => String(p) === String(userId));
  if (!isParticipant) throw new Error("Access denied");
  return thread;
};

export const sendMessage = async (threadId, senderId, text, attachments = []) => {
  await ensureThreadAccess(threadId, senderId);
  const msg = await Message.create({ thread: threadId, sender: senderId, body: text, attachments });
  await Thread.findByIdAndUpdate(threadId, {
    $set: { lastMessageAt: new Date() },
  });
  return msg.toObject();
};

export const getMessages = async (threadId, userId, { limit = 50, before } = {}) => {
  await ensureThreadAccess(threadId, userId);
  const filter = { thread: threadId };
  if (before) filter._id = { $lt: before };
  const messages = await Message.find(filter)
    .sort({ _id: -1 })
    .limit(limit)
    .populate("sender", "username avatarUrl")
    .lean();
  return messages.reverse();
};

export const markRead = async (threadId, userId) => {
  await ensureThreadAccess(threadId, userId);
  await Thread.findByIdAndUpdate(threadId, { $pull: { unreadBy: userId } });
};


