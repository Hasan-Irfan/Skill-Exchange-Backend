import { Thread } from "../model/thread.model.js";
import { Message } from "../model/message.model.js";
import User from "../model/user.model.js";
import { isGeminiUser } from "./geminiService.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

export const listMyThreads = async (userId, { limit = 20, page = 1 } = {}) => {
  const filter = { participants: userId };
  const skip = (page - 1) * limit;
  const threads = await Thread.find(filter)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("participants", "username avatarUrl")
    .populate({
      path: "exchange",
      select: "status type initiator receiver offer request agreement monetary confirmations createdAt updatedAt",
      populate: [
        { path: "initiator", select: "username avatarUrl" },
        { path: "receiver", select: "username avatarUrl" },
        { path: "request.listing", select: "title type" },
        { path: "dispute", select: "status raisedBy reason date adminResolution" }
      ]
    })
    .lean();

  // Optionally fetch last message preview
  const threadIds = threads.map(t => t._id);
  const lastMessages = await Message.aggregate([
    { $match: { thread: { $in: threadIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$thread", messageId: { $first: "$_id" }, body: { $first: "$body" }, createdAt: { $first: "$createdAt" }, sender: { $first: "$sender" } } }
  ]);
  const messageMap = new Map(lastMessages.map(m => [String(m._id), m]));

  // Filter out threads where the only other participant is a Gemini user
  const filteredThreads = threads.filter(t => {
    // Get other participants (excluding the current user)
    const otherParticipants = (t.participants || []).filter(
      p => String(p._id || p) !== String(userId)
    );
    
    // If there are no other participants or more than one other participant, include it
    if (otherParticipants.length === 0 || otherParticipants.length > 1) {
      return true;
    }
    
    // Check if the single other participant is a Gemini user
    const otherParticipant = otherParticipants[0];
    const isGemini = isGeminiUser(
      otherParticipant._id || otherParticipant,
      otherParticipant.username,
      otherParticipant.email
    );
    
    // Exclude Gemini threads from the list
    return !isGemini;
  });

  return filteredThreads.map(t => {
    const lastMessage = messageMap.get(String(t._id)) || null;
    // Ensure exchange field is always present (even if null or undefined)
    const exchange = t.exchange !== undefined ? t.exchange : null;
    
    return {
      ...t,
      lastMessage,
      exchange,
    };
  });
};

/**
 * Get or create a Gemini thread for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} The thread object
 */
export const getOrCreateGeminiThread = async (userId) => {
  // First, find or create Gemini user
  let geminiUser = await User.findOne({
    $or: [
      { username: 'gemini' },
      { username: 'gemini-bot' },
      { email: { $regex: /gemini/i } }
    ]
  }).select('_id username email').lean();

  if (!geminiUser) {
    // Create Gemini user if it doesn't exist
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    const newGeminiUser = await User.create({
      username: 'gemini-bot',
      email: 'gemini@bot.local',
      password: hashedPassword,
      role: 'user',
      bio: 'AI Assistant powered by Google Gemini',
      isVerified: true,
    });
    geminiUser = newGeminiUser.toObject();
  }

  const geminiUserId = geminiUser._id;

  // Check if thread already exists between user and Gemini
  const existingThread = await Thread.findOne({
    participants: { $all: [userId, geminiUserId], $size: 2 }
  })
    .populate('participants', 'username avatarUrl')
    .lean();

  if (existingThread) {
    return existingThread;
  }

  // Create new thread
  const newThread = await Thread.create({
    participants: [userId, geminiUserId],
  });

  // Populate and return
  const populatedThread = await Thread.findById(newThread._id)
    .populate('participants', 'username avatarUrl')
    .lean();

  return populatedThread;
};