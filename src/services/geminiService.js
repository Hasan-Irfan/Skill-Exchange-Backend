/**
 * Gemini AI Service
 * Handles communication with Google Gemini API using official SDK
 */
import { GoogleGenerativeAI } from '@google/generative-ai';

// Request deduplication and cooldown tracking
const requestCache = new Map(); // Track recent requests: key = userId+messageHash, value = { timestamp, promise }
const COOLDOWN_MS = 2000; // 2 seconds cooldown between requests
const CACHE_TTL_MS = 10000; // 10 seconds cache for duplicate detection

/**
 * Generate a hash for a message to detect duplicates
 */
const hashMessage = (userId, messageText) => {
  return `${userId}_${messageText.trim().substring(0, 50)}`;
};

/**
 * Check if request should be throttled (cooldown)
 */
const shouldThrottle = (cacheKey) => {
  const cached = requestCache.get(cacheKey);
  if (!cached) return false;
  
  const timeSinceLastRequest = Date.now() - cached.timestamp;
  return timeSinceLastRequest < COOLDOWN_MS;
};

/**
 * Clean up old cache entries
 */
const cleanupCache = () => {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      requestCache.delete(key);
    }
  }
};

/**
 * Check if a user ID or username corresponds to Gemini bot
 * @param {string|Object} userId - User ID or user object
 * @param {string} username - Username (optional, for additional check)
 * @param {string} email - Email (optional, for additional check)
 * @returns {boolean}
 */
export const isGeminiUser = (userId, username, email) => {
  // Check by username - including meta-ai-001 as mentioned by user
  if (username) {
    const lowerUsername = username.toLowerCase();
    if (lowerUsername === 'gemini' || 
        lowerUsername === 'gemini-bot' || 
        lowerUsername === 'meta-ai-001' ||
        lowerUsername.includes('gemini') ||
        lowerUsername.includes('meta-ai')) {
      return true;
    }
  }
  
  // Check by email
  if (email && email.toLowerCase().includes('gemini')) {
    return true;
  }
  
  // Check by user ID if it's a special string
  const userIdStr = String(userId || '');
  if (userIdStr.toLowerCase() === 'gemini' || userIdStr === '000000000000000000000000') {
    return true;
  }
  
  return false;
};

/**
 * Custom error class for cooldown to distinguish from API errors
 */
class CooldownError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CooldownError';
    this.isCooldown = true;
  }
}

/**
 * Send message to Gemini API and get response
 * @param {string} userMessage - The user's message text
 * @param {Array} conversationHistory - Previous messages for context (optional)
 * @param {string} userId - User ID for deduplication (optional)
 * @returns {Promise<string>} Gemini's response text
 * @throws {CooldownError} When cooldown is active (should be handled gracefully)
 */
export const sendToGemini = async (userMessage, conversationHistory = [], userId = null) => {
  // Clean up old cache entries periodically
  cleanupCache();
  
  // Request deduplication - prevent duplicate calls for the same message
  const cacheKey = userId ? hashMessage(userId, userMessage) : null;
  
  if (cacheKey) {
    // Check if this exact request is already in progress
    const cached = requestCache.get(cacheKey);
    if (cached && cached.promise) {
      console.log('🔄 Duplicate request detected, returning cached promise');
      return cached.promise;
    }
    
    // Check cooldown - prevent spam
    // IMPORTANT: Return a friendly cooldown response instead of throwing an error
    // This prevents it from being misclassified as a quota error
    if (shouldThrottle(cacheKey)) {
      const waitTime = COOLDOWN_MS - (Date.now() - cached.timestamp);
      const waitSeconds = Math.ceil(waitTime / 1000);
      console.log(`⏱️ Cooldown active, waiting ${waitTime}ms before next request`);
      // Throw CooldownError so messageService can handle it as a normal response
      throw new CooldownError(`Please wait a moment before sending another message.`);
    }
  }
  // Check for API key - try both GOOGLE_AI_API_KEY and GEMINI_API_KEY
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  
  console.log('🔑 Gemini API Key Check:', {
    hasGOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
    hasGEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'none',
  });
  
  if (!apiKey) {
    const error = new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY is not configured in environment variables');
    console.error('❌ Gemini API Key Error:', error.message);
    throw error;
  }

  if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
    throw new Error('Message text is required');
  }

  // Create promise and cache it to prevent duplicate calls
  const apiCallPromise = (async () => {
    try {
      // Initialize Google Generative AI
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Get the generative model - use gemini-1.5-flash (officially supported in Google AI Studio)
      // Note: gemini-2.0-flash is not yet available in Google AI Studio
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Build conversation history - convert to SDK format
      // IMPORTANT: Chat history MUST start with 'user' role, not 'model'
      // The SDK expects history as an array of objects with role and parts
      let chatHistory = conversationHistory
        .filter(msg => {
          // Filter out empty messages
          const text = msg.parts?.[0]?.text || msg.text || '';
          return text.trim().length > 0;
        })
        .map(msg => {
          // Extract text from parts array or use text directly
          const text = msg.parts?.[0]?.text || msg.text || '';
          return {
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: text.trim() }],
          };
        });

      // Ensure history starts with 'user' role - remove any leading 'model' messages
      // This can happen if the conversation history starts with a Gemini response
      while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
        console.log('⚠️ Chat history starts with model role, removing first message');
        chatHistory = chatHistory.slice(1);
      }

      // Current user message
      const currentMessage = userMessage.trim();

      console.log('📤 Sending to Gemini API:', {
        model: 'gemini-1.5-flash',
        messageLength: currentMessage.length,
        historyLength: chatHistory.length,
        historyRoles: chatHistory.map(h => h.role),
      });

      // Start a chat session with history if available
      let result;
      if (chatHistory.length > 0) {
        // Use chat.sendMessage for conversations with history
        const chat = model.startChat({
          history: chatHistory,
        });
        result = await chat.sendMessage(currentMessage);
      } else {
        // Use generateContent for single messages without history
        result = await model.generateContent(currentMessage);
      }

      // Get the response
      const response = await result.response;
      const responseText = response.text();

      if (!responseText || responseText.trim().length === 0) {
        throw new Error('No response text from Gemini');
      }

      console.log('✅ Gemini API Success:', {
        model: 'gemini-1.5-flash',
        responseLength: responseText.length,
        preview: responseText.substring(0, 100) + '...',
      });

      return responseText.trim();
    } catch (error) {
      console.error('❌ Error calling Gemini API:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        status: error.status,
        statusCode: error.statusCode,
      });
      
      // Check for explicit HTTP status codes first (most reliable)
      // Gemini API uses HTTP status 429 for quota/rate limit errors
      const httpStatus = error.status || error.statusCode || error.response?.status;
      
      if (httpStatus === 429) {
        // Explicit HTTP 429 = Rate limit/quota exceeded
        console.error('⏱️ Gemini API Rate Limit Error - HTTP 429');
        throw new Error('QUOTA_EXCEEDED');
      }
      
      // Check for explicit RESOURCE_EXHAUSTED error code (from gRPC)
      // This is the official Google API error code for quota limits
      if (error.message?.includes('RESOURCE_EXHAUSTED') && 
          !error.message?.includes('quota exceeded') && // Avoid false positives
          !error.message?.toLowerCase().includes('wait')) { // Avoid matching cooldown messages
        console.error('⏱️ Gemini API Resource Exhausted - RESOURCE_EXHAUSTED');
        throw new Error('QUOTA_EXCEEDED');
      }
      
      // Check for API key errors (explicit)
      if (error.message?.includes('API_KEY') || 
          error.message?.includes('API key') ||
          httpStatus === 401) {
        throw new Error('Invalid API key. Please check your GOOGLE_AI_API_KEY environment variable.');
      }
      
      // Check for model errors (explicit)
      if (error.message?.includes('model') && 
          (error.message?.includes('not found') || 
           error.message?.includes('not available') ||
           httpStatus === 404)) {
        throw new Error('Model not available. Please check the model name.');
      }
      
      // Re-throw original error for other cases
      throw error;
    } finally {
      // Clean up cache after request completes
      if (cacheKey) {
        const cached = requestCache.get(cacheKey);
        if (cached) {
          // Update timestamp for cooldown
          cached.timestamp = Date.now();
          cached.promise = null; // Clear promise after completion
        }
      }
    }
  })();

  // Cache the promise to prevent duplicate calls
  if (cacheKey) {
    requestCache.set(cacheKey, {
      timestamp: Date.now(),
      promise: apiCallPromise,
    });
  }

  return apiCallPromise;
};

// Export CooldownError for use in messageService
export { CooldownError };
