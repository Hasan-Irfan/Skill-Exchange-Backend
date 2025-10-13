import { Thread } from "../model/thread.model.js";
import { Message } from "../model/message.model.js";

export const listMyThreads = async (userId, { limit = 20, page = 1 } = {}) => {
  const filter = { participants: userId };
  const skip = (page - 1) * limit;
  const threads = await Thread.find(filter)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("participants", "username avatarUrl")
    .lean();

  // Optionally fetch last message preview
  const threadIds = threads.map(t => t._id);
  const lastMessages = await Message.aggregate([
    { $match: { thread: { $in: threadIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$thread", messageId: { $first: "$_id" }, body: { $first: "$body" }, createdAt: { $first: "$createdAt" }, sender: { $first: "$sender" } } }
  ]);
  const messageMap = new Map(lastMessages.map(m => [String(m._id), m]));

  return threads.map(t => ({
    ...t,
    lastMessage: messageMap.get(String(t._id)) || null,
  }));
};


