/**
 * Gemini Trigger Service
 * Handles triggering Gemini responses after user messages
 * 
 * This service is called AFTER a user message is saved.
 * It checks if Gemini should respond and handles the response.
 */

import { Thread } from "../model/thread.model.js";
import { Message } from "../model/message.model.js";
import { generateGeminiResponse, isGeminiAvailable } from "./geminiService.js";

/**
 * Maybe trigger Gemini reply after user sends a message
 * 
 * Rules:
 * - Only responds in 1-on-1 threads with Gemini
 * - Never responds to itself
 * - Never responds to empty messages
 * - Never responds in group chats
 * 
 * @param {string} threadId - Thread ID
 * @param {Object} userMessage - The user message that was just saved
 */
export const maybeTriggerGeminiReply = async (threadId, userMessage) => {
  // Safety: Check if Gemini is available
  if (!isGeminiAvailable()) {
    return; // Silently exit if Gemini not configured
  }

  const geminiUserId = process.env.GEMINI_USER_ID;
  if (!geminiUserId) {
    return; // Silently exit if Gemini user ID not set
  }

  try {
    // Load thread
    const thread = await Thread.findById(threadId).lean();
    if (!thread) {
      return; // Thread not found, exit silently
    }

    // Safety checks
    const isGeminiSender = String(userMessage.sender) === String(geminiUserId);
    if (isGeminiSender) {
      return; // Gemini never replies to itself
    }

    const hasMessageBody = userMessage.body && userMessage.body.trim();
    if (!hasMessageBody) {
      return; // Never respond to empty messages
    }

    // Must be AI thread with exactly 2 participants
    if (thread.isAI !== true) {
      return; // Not an AI thread
    }

    if (thread.participants?.length !== 2) {
      return; // Not a 1-on-1 thread
    }

    // Must include Gemini user
    const hasGemini = thread.participants.some(
      p => String(p) === String(geminiUserId)
    );
    if (!hasGemini) {
      return; // Gemini is not a participant
    }

    // Get the other participant (the human user)
    const humanUserId = thread.participants.find(
      p => String(p) !== String(geminiUserId)
    );
    if (!humanUserId) {
      return; // Couldn't find human user
    }

    // All checks passed - generate and save Gemini response
    try {
      const responseText = await generateGeminiResponse(
        threadId,
        humanUserId,
        userMessage.body
      );

      // Save Gemini's response as a message
      const geminiMessage = await Message.create({
        thread: threadId,
        sender: geminiUserId,
        body: responseText,
        attachments: []
      });

      // Update thread's last message timestamp
      await Thread.findByIdAndUpdate(threadId, {
        $set: { lastMessageAt: new Date() },
        $addToSet: { unreadBy: humanUserId } // Mark as unread for human user
      });

      return geminiMessage.toObject();
    } catch (error) {
      // Log error but don't fail the user's message
      console.error("Failed to generate Gemini response:", error.message);
      // Silently fail - user's message was already saved
      return null;
    }
  } catch (error) {
    // Log error but don't affect user's message
    console.error("Error in maybeTriggerGeminiReply:", error.message);
    return null;
  }
};

