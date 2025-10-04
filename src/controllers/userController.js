import { getUserDashboard , getUserProfile , updateUserProfile } from "../services/userService.js";

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
    const user = await updateUserProfile(req.user.id, req.body);
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
