import { asyncHandler } from "../utils/asyncHandler.js";
import {
  loginUser,
  registerUser,
  verifyUserEmail,
  logoutUser,
  refreshTokenService,
  sendResetPasswordEmail,
  updateUserPassword,
} from "../services/authServices.js";

// Login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await loginUser(email, password);

  if (result.error) return res.status(400).json({ success: false, message: result.error });

  const { user, accessToken, refreshToken } = result;
  const options = { httpOnly: true, secure: true };

  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      success: true,
      message: "Logged in successfully",
      username: user.username,
      userID: user._id,
      email: user.email,
      roles: user.roles,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      status: user.status,
      rating: user.rating,
      location: user.location,
    });
});

// Signup
export const Signup = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  const result = await registerUser(username, email, password);

  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.status(201).json({ success: true, message: result.message });
});

// Verify email
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const result = await verifyUserEmail(token);

  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.status(200).json({ success: true, message: result.message });
});

// Logout
export const logout = asyncHandler(async (req, res) => {
  const result = await logoutUser(req.user._id);
  const options = { httpOnly: true, secure: true };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({ success: true, message: result.message });
});

// Refresh token
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  const result = await refreshTokenService(incomingRefreshToken);

  if (result.error) return res.status(401).json({ success: false, message: result.error });

  const options = { httpOnly: true, secure: true };
  res
    .status(200)
    .cookie("accessToken", result.accessToken, options)
    .cookie("refreshToken", result.refreshToken, options)
    .json({ success: true, ...result });
});

// Reset password
export const resetPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await sendResetPasswordEmail(email);

  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.status(200).json({ success: true, message: result.message });
});

// Update password
export const updatePassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { password } = req.body;
  const result = await updateUserPassword(resetToken, password);

  if (result.error) return res.status(400).json({ success: false, message: result.error });
  res.status(200).json({ success: true, message: result.message });
});
