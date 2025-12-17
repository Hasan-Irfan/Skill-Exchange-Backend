/**
 * Gemini Thread Service
 * Handles thread creation and management for Gemini conversations
 */

import { Thread } from "../model/thread.model.js";

/**
 * Get or create a 1-on-1 thread between user and Gemini
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Thread object
 */
// export const getOrCreateGeminiThread = async (userId) => {
//   const geminiUserId = process.env.GEMINI_USER_ID;
  
//   if (!geminiUserId) {
//     throw new Error("GEMINI_USER_ID is not configured");
//   }

//   // Ensure both IDs are strings for comparison
//   const userIdStr = String(userId);
//   const geminiUserIdStr = String(geminiUserId);

//   // Look for existing thread with exactly these two participants
//   const existingThread = await Thread.findOne({
//     participants: { 
//       $size: 2,
//       $all: [userId, geminiUserId]
//     },
//     isAI: true
//   }).lean();

//   if (existingThread) {
//     return existingThread;
//   }

//   // Create new thread
//   const newThread = await Thread.create({
//     participants: [userId, geminiUserId],
//     isAI: true,
//     lastMessageAt: new Date(),
//     unreadBy: []
//   });

//   return newThread.toObject();
// };
export const getOrCreateGeminiThread = async (userId) => {
  const geminiUserId = process.env.GEMINI_USER_ID;

  if (!geminiUserId) throw new Error("GEMINI_USER_ID is not configured");

  // Look for an existing thread **for this user only**
  const existingThread = await Thread.findOne({
    participants: { $size: 2, $all: [userId, geminiUserId] },
    isAI: true,
    createdBy: userId // ✅ Only threads created for this user
  }).lean();

  if (existingThread) return existingThread;

  // Create a new private thread
  const newThread = await Thread.create({
    participants: [userId, geminiUserId],
    isAI: true,
    lastMessageAt: new Date(),
    unreadBy: [],
    createdBy: userId // ✅ Track which user this thread belongs to
  });

  return newThread.toObject();
};
/**
 * Check if a thread is a Gemini thread (1-on-1 with Gemini)
 * 
 * @param {string} threadId - Thread ID
 * @returns {Promise<boolean>}
 */
export const isGeminiThread = async (threadId) => {
  const geminiUserId = process.env.GEMINI_USER_ID;
  
  if (!geminiUserId) {
    return false;
  }

  const thread = await Thread.findById(threadId).lean();
  if (!thread) {
    return false;
  }

  // Must be AI thread with exactly 2 participants including Gemini
  return (
    thread.isAI === true &&
    thread.participants?.length === 2 &&
    thread.participants.some(p => String(p) === String(geminiUserId))
  );
};

