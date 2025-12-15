import { Thread } from "../model/thread.model.js";
import { Message } from "../model/message.model.js";
import { isGeminiUser, sendToGemini, CooldownError } from "./geminiService.js";
import User from "../model/user.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

export const ensureThreadAccess = async (threadId, userId) => {
  const thread = await Thread.findById(threadId).lean();
  if (!thread) throw new Error("Thread not found");
  const isParticipant = thread.participants.some((p) => String(p) === String(userId));
  if (!isParticipant) throw new Error("Access denied");
  return thread;
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

  // Check if message has attachments - Gemini doesn't support attachments
  const normalizedAttachments = normalize(attachments);
  if (normalizedAttachments.length > 0) {
    console.log('[sendMessage] Message has attachments, but continuing with text only for Gemini check');
  }

  // Get thread to check for Gemini participant
  const thread = await Thread.findById(threadId)
    .populate('participants', 'username email _id')
    .lean();

  if (!thread) {
    throw new Error('Thread not found');
  }

  // Check if one of the participants is Gemini and get/create Gemini user
  let geminiParticipant = null;
  let geminiUserId = null;
  
  if (thread.participants && thread.participants.length > 0) {
    geminiParticipant = thread.participants.find(p => 
      isGeminiUser(p._id || p, p.username, p.email)
    );
    
    if (geminiParticipant) {
      geminiUserId = geminiParticipant._id || geminiParticipant;
    } else {
      // Check if any participant ID matches Gemini pattern
      for (const p of thread.participants) {
        const participantId = p._id || p;
        if (isGeminiUser(participantId)) {
          geminiUserId = participantId;
          break;
        }
      }
    }
    
    // If Gemini participant found by ID but not populated, find/create the user
    if (geminiUserId && !geminiParticipant) {
      try {
        geminiParticipant = await User.findById(geminiUserId)
          .select('username email _id')
          .lean();
        
        if (!geminiParticipant) {
          // User ID was in thread but user doesn't exist - try to find by username/email
          const geminiUser = await User.findOne({ 
            $or: [
              { username: 'gemini' },
              { username: 'gemini-bot' },
              { email: { $regex: /gemini/i } }
            ]
          }).select('username email _id').lean();
          
          if (geminiUser) {
            geminiParticipant = geminiUser;
            geminiUserId = geminiUser._id;
          }
        }
      } catch (error) {
        console.error('Error finding Gemini user:', error);
      }
    }
    
    // If still no Gemini user found but thread has a Gemini participant, create one
    if (!geminiParticipant && !geminiUserId) {
      try {
        const geminiUser = await User.findOne({ 
          $or: [
            { username: 'gemini' },
            { username: 'gemini-bot' },
            { email: { $regex: /gemini/i } }
          ]
        }).select('username email _id').lean();
        
        if (geminiUser) {
          geminiParticipant = geminiUser;
          geminiUserId = geminiUser._id;
          // Add Gemini user to thread if not already present
          await Thread.findByIdAndUpdate(threadId, {
            $addToSet: { participants: geminiUserId }
          });
        } else {
          // Create Gemini user if it doesn't exist
          const randomPassword = crypto.randomBytes(32).toString('hex');
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          const newGeminiUser = await User.create({
            username: 'gemini-bot',
            email: 'gemini@bot.local',
            password: hashedPassword,
            role: 'user',
            bio: 'AI Assistant powered by Google Gemini',
            isVerified: true, // Bot users are auto-verified
          });
          geminiParticipant = newGeminiUser.toObject();
          geminiUserId = newGeminiUser._id;
          // Add Gemini user to thread
          await Thread.findByIdAndUpdate(threadId, {
            $addToSet: { participants: geminiUserId }
          });
        }
      } catch (error) {
        console.error('Error finding/creating Gemini user:', error);
      }
    }
  }

  // Create user message
  const messageData = {
    thread: threadId,
    sender: senderId,
    body: text,
  };

  if (normalizedAttachments.length > 0) {
    messageData.attachments = normalizedAttachments;
  }

  const userMsg = await Message.create(messageData);

  await Thread.findByIdAndUpdate(threadId, {
    $set: { lastMessageAt: new Date() },
  });

  // CRITICAL: Only call Gemini if this is a TRUE 1-on-1 conversation with Gemini
  // Conditions:
  // 1. Thread has exactly 2 participants (sender + Gemini)
  // 2. One participant is Gemini
  // 3. The sender is NOT Gemini
  // 4. Message has text content
  
  const participantIds = (thread.participants || []).map(p => String(p._id || p));
  const isOneOnOneWithGemini = 
    participantIds.length === 2 &&
    geminiUserId && 
    geminiParticipant && 
    String(senderId) !== String(geminiUserId) &&
    participantIds.includes(String(geminiUserId)) &&
    participantIds.includes(String(senderId));

  // If this is a Gemini thread and user sent the message (not Gemini), get Gemini response
  // IMPORTANT: Only call Gemini when user sends a message, not on fetches or re-renders
  // AND only if it's a true 1-on-1 conversation (exactly 2 participants)
  if (isOneOnOneWithGemini) {
    // Additional check: ensure this is a real user message (not empty, not from system)
    if (!text || text.trim().length === 0) {
      // Don't call Gemini for empty messages
      return userMsg.toObject();
    }

    try {
      // Get conversation history for context (last 10 messages)
      // Only get messages that are already saved (not including the current one)
      const recentMessages = await Message.find({ 
        thread: threadId,
        _id: { $ne: userMsg._id } // Exclude the current message
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('sender', 'username email _id')
        .lean();
      
      // Reverse to get chronological order
      const conversationHistory = recentMessages.reverse()
        .filter(msg => msg.body && msg.body.trim().length > 0) // Filter out empty messages
        .map(msg => ({
          role: isGeminiUser(msg.sender?._id || msg.sender, msg.sender?.username, msg.sender?.email) ? 'model' : 'user',
          parts: [{ text: msg.body || '' }]
        }));

      // Call Gemini API with user ID for deduplication and cooldown
      // Add small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const geminiResponse = await sendToGemini(text.trim(), conversationHistory, String(senderId));
      
      // Create Gemini's response message
      const geminiMessageData = {
        thread: threadId,
        sender: geminiUserId,
        body: geminiResponse,
      };

      const geminiMsg = await Message.create(geminiMessageData);

      await Thread.findByIdAndUpdate(threadId, {
        $set: { lastMessageAt: new Date() },
      });

      // Return both messages so they can be emitted separately
      return {
        userMessage: userMsg.toObject(),
        geminiMessage: geminiMsg.toObject(),
      };
    } catch (error) {
      console.error('❌ Error getting Gemini response:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        isCooldown: error.isCooldown,
      });
      
      // Handle cooldown errors FIRST - these should be treated as normal responses, not errors
      // CooldownError is a local throttling mechanism and should not trigger quota error messages
      if (error instanceof CooldownError || error.isCooldown) {
        console.log('⏱️ Cooldown active - returning friendly message');
        const cooldownMessage = error.message || 'Please wait a moment before sending another message.';
        
        try {
          const cooldownMsg = await Message.create({
            thread: threadId,
            sender: geminiUserId,
            body: cooldownMessage,
          });
          
          await Thread.findByIdAndUpdate(threadId, {
            $set: { lastMessageAt: new Date() },
          });

          return {
            userMessage: userMsg.toObject(),
            geminiMessage: cooldownMsg.toObject(),
          };
        } catch (createError) {
          console.error('❌ Error creating cooldown message:', createError);
          // Return only user message if we can't create cooldown message
          return userMsg.toObject();
        }
      }
      
      // Handle actual Gemini API errors
      let errorMessage = 'Sorry, I encountered an error processing your message. Please try again.';
      
      // Check for explicit QUOTA_EXCEEDED error (only thrown for real quota limits)
      // This is distinct from cooldown - it means the API itself has exceeded limits
      if (error.message === 'QUOTA_EXCEEDED' || 
          (error.message?.includes('QUOTA_EXCEEDED') && !error.isCooldown)) {
        errorMessage = 'I apologize, but I\'ve reached my daily message limit. Please try again tomorrow, or contact support if you need immediate assistance.';
        console.error('⏱️ Gemini API Quota Exceeded - Real quota limit reached');
      } 
      // Check for API key configuration errors
      else if (error.message.includes('GOOGLE_AI_API_KEY') || 
               error.message.includes('GEMINI_API_KEY') ||
               error.message.includes('not configured')) {
        errorMessage = 'AI service is not configured. Please contact support.';
        console.error('🔑 API Key Configuration Error - Check environment variables');
      } 
      // Check for API key authentication errors (explicit)
      else if (error.message.includes('Invalid API key') || 
               error.message.includes('401') ||
               error.message.includes('authentication')) {
        errorMessage = 'AI service authentication failed. Please contact support.';
        console.error('🔑 API Key Authentication Error - Check if API key is valid');
      } 
      // Check for access denied errors (explicit)
      else if (error.message.includes('403') || 
               error.message.includes('access denied')) {
        errorMessage = 'AI service access denied. Please contact support.';
        console.error('🚫 API Access Denied - Check API key permissions');
      } 
      // Check for model errors (explicit)
      else if (error.message.includes('Model not available') ||
               error.message.includes('model') && error.message.includes('not found')) {
        errorMessage = 'AI service is temporarily unavailable. Please try again later.';
        console.error('🚫 Model Error - Model not available');
      }
      // For all other errors, use generic message
      else {
        console.error('⚠️ Unknown Gemini API Error:', error.message);
      }
      
      // Continue even if Gemini fails - return user message
      // Optionally create an error message from Gemini
      try {
        const errorMsg = await Message.create({
          thread: threadId,
          sender: geminiUserId,
          body: errorMessage,
        });
        
        await Thread.findByIdAndUpdate(threadId, {
          $set: { lastMessageAt: new Date() },
        });

        return {
          userMessage: userMsg.toObject(),
          geminiMessage: errorMsg.toObject(),
        };
      } catch (createError) {
        console.error('❌ Error creating Gemini error message:', createError);
        // Return only user message if we can't create error message
        return userMsg.toObject();
      }
    }
  }

  return userMsg.toObject();
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


