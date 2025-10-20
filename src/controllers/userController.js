import { getUserDashboard , getUserProfile , updateUserProfile } from "../services/userService.js";
import cloudinary from "../config/cloudinary.js";

export const getProfile = async (req, res) => {
  try {
    const user = await getUserProfile(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Handle avatar upload if file is present
    if (req.file) {
      try {
        // Upload to Cloudinary using upload_stream
        const uploadPromise = new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { resource_type: 'image', folder: 'avatars' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.file.buffer);
        });
        
        const result = await uploadPromise;
        updateData.avatarUrl = result.secure_url;
      } catch (uploadError) {
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to upload avatar: ' + uploadError.message 
        });
      }
    }
    
    const user = await updateUserProfile(req.user.id, updateData);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const dashboard = await getUserDashboard(req.user.id);
    res.json({ success: true, data: dashboard });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
