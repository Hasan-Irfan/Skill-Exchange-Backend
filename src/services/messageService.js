import { Thread } from "../model/thread.model.js";
import { Message } from "../model/message.model.js";
import User from "../model/user.model.js";

export const ensureThreadAccess = async (threadId, userId) => {
  const thread = await Thread.findById(threadId).lean();
  if (!thread) throw new Error("Thread not found");

  // Normal access: user must be a participant in the thread
  const isParticipant = thread.participants.some((p) => String(p) === String(userId));
  if (isParticipant) return thread;

  // Admin override: allow admins/superAdmins to view any thread
  // This is used for admin tools like dispute resolution.
  if (userId) {
    const user = await User.findById(userId).lean();
    const role = user?.role;
    if (role === "admin" || role === "superAdmin") {
      return thread;
    }
  }

  throw new Error("Access denied");
};

// export const sendMessage = async (threadId, senderId, text, attachments = []) => {
//   await ensureThreadAccess(threadId, senderId);
//   const msg = await Message.create({ thread: threadId, sender: senderId, body: text, attachments });
//   await Thread.findByIdAndUpdate(threadId, {
//     $set: { lastMessageAt: new Date() },
//   });
//   return msg.toObject();
// };

export const sendMessage = async (threadId, senderId, text, attachments = []) => {
  await ensureThreadAccess(threadId, senderId);

  try {
    const preview = (() => {
      if (typeof attachments === 'string') return attachments.slice(0, 200);
      try { return JSON.stringify(attachments).slice(0, 200); } catch { return '[unserializable]'; }
    })();
    console.log('[sendMessage] incoming attachments type:', typeof attachments, 'preview:', preview);
    try {
      const caster = Message.schema.path('attachments')?.caster?.instance || 'unknown';
      console.log('[sendMessage] schema attachments caster instance:', caster);
    } catch {}
  } catch (e) {
    console.log('[sendMessage] attachments preview logging failed:', e?.message);
  }

  const normalize = (input) => {
    if (!input) return [];
    let arr = input;
    if (typeof arr === 'string') {
      try {
        const parsed = JSON.parse(arr);
        arr = parsed;
      } catch (_) {
        return [];
      }
    }
    if (!Array.isArray(arr)) return [];
    const result = [];
    for (const item of arr) {
      let obj = item;
      if (typeof obj === 'string') {
        try {
          obj = JSON.parse(obj);
        } catch (_) {
          continue;
        }
      }
      if (obj && typeof obj === 'object') {
        const normalized = {
          url: obj.url,
          type: obj.type,
          filename: obj.filename,
          size: obj.size,
        };
        if (normalized.url) result.push(normalized);
      }
    }
    return result;
  };

  const messageData = {
    thread: threadId,
    sender: senderId,
    body: text,
  };

  const normalizedAttachments = normalize(attachments);
  try {
    console.log('[sendMessage] normalized attachments length:', normalizedAttachments.length, 'first:', normalizedAttachments[0] || null);
  } catch {}
  if (normalizedAttachments.length > 0) {
    messageData.attachments = normalizedAttachments;
  }

  const msg = await Message.create(messageData);

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


