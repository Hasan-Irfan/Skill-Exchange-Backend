import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { uploadMessageFile } from "../middlewares/multer.js";
import { postMessage, getThreadMessages, readThread, getGeminiThread} from "../controllers/messageController.js";

const router = express.Router();

// Route with file upload support - multer handles file upload
// Text validation is handled in controller
router.post(
  "/threads/:threadId/messages", 
  jwtVerify, 
  uploadMessageFile.single('file'), // Handle file upload (optional)
  postMessage
);
router.get("/threads/:threadId/messages", jwtVerify, getThreadMessages);
router.post("/threads/:threadId/read", jwtVerify, readThread);

// Gemini AI thread endpoint
router.get("/threads/gemini", jwtVerify, getGeminiThread);

export default router;


