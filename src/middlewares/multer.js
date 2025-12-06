// middleware/multer.js
import multer from "multer";
import path from "path";

// store in memory, since we'll directly send buffer to Cloudinary
const storage = multer.memoryStorage();

// File filter for images only (for avatar/profile)
const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg" || ext === ".png") {
    cb(null, true);
  } else {
    cb(new Error("Only .jpg, .jpeg, and .png files are allowed"), false);
  }
};

// File filter for messages (images and documents)
const messageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  // Allowed image types
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  // Allowed document types
  const docExts = [".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx", ".ppt", ".pptx", ".zip", ".rar"];
  
  if (imageExts.includes(ext) || docExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed. Allowed: images (jpg, jpeg, png, gif, webp) and documents (pdf, doc, docx, txt, xls, xlsx, ppt, pptx, zip, rar)"), false);
  }
};

export const upload = multer({ storage, fileFilter: imageFileFilter });
export const uploadMessageFile = multer({ 
  storage, 
  fileFilter: messageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});
