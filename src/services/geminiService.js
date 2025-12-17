/**
 * Gemini AI Service
 * Handles communication with Google Gemini API via @google/genai
 */

import { GoogleGenAI } from "@google/genai";
import { Message } from "../model/message.model.js";
import User from "../model/user.model.js";

// Initialize Gemini client
const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  console.warn("GOOGLE_AI_API_KEY is not set. Gemini functionality will be disabled.");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Choose a supported model (general text)
const GEMINI_MODEL = "gemini-2.5-flash"; // recommended for text generation

const SYSTEM_PROMPT = `
You are an AI assistant inside a web application.
Be concise and helpful. Respond naturally to user questions.
`;

/**
 * Build conversation history from messages
 */
const buildConversationHistory = async (threadId, limit = 10) => {
  try {
    const messages = await Message.find({ thread: threadId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "username")
      .lean();

    messages.reverse();

    const geminiUserId = process.env.GEMINI_USER_ID;
    if (!geminiUserId) throw new Error("GEMINI_USER_ID not configured");

    return messages.map(msg => ({
      role: String(msg.sender._id) === String(geminiUserId) ? "assistant" : "user",
      content: msg.body || "",
    }));
  } catch (error) {
    console.error("Error building history:", error);
    return [];
  }
};

/**
 * Get user's name
 */
const getUserName = async (userId) => {
  try {
    const user = await User.findById(userId).select("username").lean();
    return user?.username || "User";
  } catch {
    return "User";
  }
};

/**
 * Generate AI response using Gemini
 */
export const generateGeminiResponse = async (threadId, userId, userMessage) => {
  if (!ai) throw new Error("Gemini API not configured.");

  if (!userMessage?.trim()) throw new Error("User message is empty");

  try {
    const history = await buildConversationHistory(threadId, 10);
    const userName = await getUserName(userId);

    const contents = [
      { text: SYSTEM_PROMPT },
      ...history.map(h => ({ text: h.content })),
      { text: `${userName}: ${userMessage}` }
    ];

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const text = response.text || "";
    if (!text.trim()) throw new Error("Empty response from Gemini");

    return text.trim();
  } catch (error) {
    console.error("Error generating Gemini response:", error);
    if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
      throw new Error("Gemini rate limit exceeded. Try again later.");
    }
    throw new Error(`AI generation failed: ${error.message}`);
  }
};

/**
 * Check if Gemini is available
 */
export const isGeminiAvailable = () => !!apiKey && !!ai && !!process.env.GEMINI_USER_ID;
