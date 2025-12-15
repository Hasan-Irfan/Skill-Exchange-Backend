import { asyncHandler } from "../utils/asyncHandler.js";
import { sendMessage, getMessages, markRead } from "../services/messageService.js";
import cloudinary from "../config/cloudinary.js";
import path from "path";

// export const postMessage = asyncHandler(async (req, res) => {
//   const { threadId } = req.params;
//   const text = req.body.text || '';
  
//   // Validate: must have either text or file
//   if (!text.trim() && !req.file) {
//     return res.status(400).json({ 
//       success: false, 
//       message: 'Message must contain either text or a file' 
//     });
//   }
  
//   // Validate text length if provided
//   if (text && text.length > 5000) {
//     return res.status(400).json({ 
//       success: false, 
//       message: 'Text message cannot exceed 5000 characters' 
//     });
//   }
  
//   let attachments = [];
  
//   // Handle file upload if present
//   if (req.file) {
//     try {
//       const ext = path.extname(req.file.originalname).toLowerCase();
//       const isImage = [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
      
//       // Determine resource type for Cloudinary
//       const resourceType = isImage ? 'image' : 'raw';
//       const folder = isImage ? 'chat/images' : 'chat/files';
      
//       // Upload to Cloudinary
//       const uploadPromise = new Promise((resolve, reject) => {
//         cloudinary.uploader.upload_stream(
//           { 
//             resource_type: resourceType,
//             folder: folder,
//             public_id: `${threadId}_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`
//           },
//           (error, result) => {
//             if (error) reject(error);
//             else resolve(result);
//           }
//         ).end(req.file.buffer);
//       });
      
//       const result = await uploadPromise;
      
//       // Determine file type for attachment
//       let fileType = 'file';
//       if (isImage) {
//         fileType = 'image';
//       } else if (ext === '.pdf') {
//         fileType = 'pdf';
//       } else if (['.doc', '.docx'].includes(ext)) {
//         fileType = 'document';
//       } else if (['.xls', '.xlsx'].includes(ext)) {
//         fileType = 'spreadsheet';
//       } else if (['.ppt', '.pptx'].includes(ext)) {
//         fileType = 'presentation';
//       } else if (['.zip', '.rar'].includes(ext)) {
//         fileType = 'archive';
//       }
      
//       attachments.push({
//         url: result.secure_url,
//         type: fileType,
//         filename: req.file.originalname,
//         size: req.file.size
//       });
//     } catch (uploadError) {
//       return res.status(400).json({ 
//         success: false, 
//         message: 'Failed to upload file: ' + uploadError.message 
//       });
//     }
//   }
  
//   // Parse attachments from body if provided (for backward compatibility)
//   // if (req.body.attachments && Array.isArray(req.body.attachments)) {
//   //   attachments = [...attachments, ...req.body.attachments];
//   // }
//   if (!req.file) {
//     attachments = [];
//   }
  
//   const msg = await sendMessage(threadId, req.user.id, text, attachments);
//   const io = req.app.get('io');
//   io.to(String(threadId)).emit('message:new', { threadId, message: msg });
//   res.status(201).json({ success: true, data: msg });
// });

export const postMessage = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const text = req.body.text || '';

  // Validate: must have either text or file
  if (!text.trim() && !req.file) {
    return res.status(400).json({
      success: false,
      message: 'Message must contain either text or a file',
    });
  }
  
  // Validate text length if provided
  if (text && text.length > 5000) {
    return res.status(400).json({
      success: false,
      message: 'Text message cannot exceed 5000 characters',
    });
  }

  let attachments = [];

  // Handle file upload if present
  if (req.file) {
    try {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);

      const resourceType = isImage ? 'image' : 'raw';
      const folder = isImage ? 'chat/images' : 'chat/files';

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: resourceType,
            folder: folder,
            public_id: `${threadId}_${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });

      // Determine type for attachment
      let fileType = 'file';
      if (isImage) fileType = 'image';
      else if (ext === '.pdf') fileType = 'pdf';
      else if (['.doc', '.docx'].includes(ext)) fileType = 'document';
      else if (['.xls', '.xlsx'].includes(ext)) fileType = 'spreadsheet';
      else if (['.ppt', '.pptx'].includes(ext)) fileType = 'presentation';
      else if (['.zip', '.rar'].includes(ext)) fileType = 'archive';

      attachments.push({
        url: uploadResult.secure_url,
        type: fileType,
        filename: req.file.originalname,
        size: req.file.size,
      });
    } catch (uploadError) {
      return res.status(400).json({
        success: false,
        message: 'Failed to upload file: ' + uploadError.message,
      });
    }
  }

  // CRITICAL: Only use attachments from file upload
  // Do NOT use req.body.attachments at all
  
  const result = await sendMessage(threadId, req.user.id, text, attachments);
  const io = req.app.get('io');
  
  // Handle Gemini response (result can be a single message or an object with userMessage and geminiMessage)
  const { Message } = await import('../model/message.model.js');
  
  if (result && typeof result === 'object' && result.userMessage && result.geminiMessage) {
    // Gemini thread - emit both messages
    const populatedUserMsg = await Message.findById(result.userMessage._id)
      .populate('sender', 'username avatarUrl')
      .lean();

    const populatedGeminiMsg = await Message.findById(result.geminiMessage._id)
      .populate('sender', 'username avatarUrl')
      .lean();

    // Emit user message first
    io.to(String(threadId)).emit('message:new', { threadId, message: populatedUserMsg });
    
    // Small delay before emitting Gemini response for better UX
    setTimeout(() => {
      io.to(String(threadId)).emit('message:new', { threadId, message: populatedGeminiMsg });
    }, 300);
    
    // Return user message in response
    res.status(201).json({ success: true, data: populatedUserMsg });
  } else {
    // Regular message - emit normally
    const populated = await Message.findById(result._id)
      .populate('sender', 'username avatarUrl')
      .lean();

    io.to(String(threadId)).emit('message:new', { threadId, message: populated });
    res.status(201).json({ success: true, data: populated });
  }
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

export const getGeminiThread = asyncHandler(async (req, res) => {
  const { getOrCreateGeminiThread } = await import("../services/threadService.js");
  const thread = await getOrCreateGeminiThread(req.user.id);
  res.json({ success: true, data: thread });
});


