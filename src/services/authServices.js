import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../model/user.model.js";

// Generate access & refresh tokens
const generateTokens = (userID) => {
  const accessToken = jwt.sign(
    { _id: userID },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "45m" }
  );

  const refreshToken = jwt.sign(
    { _id: userID },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

// Login logic
export const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) return { error: "User not found" };

  if (!user.isVerified) return { error: "Please verify your email before logging in" };

  const matchPass = await bcrypt.compare(password, user.password);
  if (!matchPass) return { error: "Invalid password" };

  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  const savedUser = await user.save();

  return {
    user: savedUser,
    accessToken,
    refreshToken,
  };
};

// Signup logic
export const registerUser = async (username, email, password) => {
  if (!username || !email || !password) {
    return { error: "Please enter all the fields" };
  }

  if (password.length < 6) {
    return { error: "Please enter a password of at least 6 characters" };
  }

  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    return { error: "User or Email already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = new User({
    username,
    email,
    password: hashedPassword,
    roles: email === process.env.ADMIN_EMAIL ? ["admin"] : ["user"],
    status: "active",
    isVerified: false,
    rating: {
      avg: 0,
      count: 0
    },
    notificationPrefs: {
      email: true,
      sms: false,
      push: false
    }
  });

  await newUser.save();

  const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  const verificationUrl = `http://localhost:8080/api/v1/verify-email/${token}`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
  });

  try {
    await transporter.verify();
    console.log("SMTP connection verified successfully");

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: newUser.email,
      subject: "Verify Your Email",
      html: `<p>Click the link to verify your email: <a href="${verificationUrl}">${verificationUrl}</a></p>`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully");

    return { message: "User registered successfully. Please verify your email." };
  } catch (emailError) {
    console.error("Email sending failed:", emailError);
    // Return error when email fails
    return { 
      error: "Failed to send verification email. Please try again later.",
      details: emailError.message
    };
  }
};

// Verify email
export const verifyUserEmail = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (!user) return { error: "User not found" };
  if (user.isVerified) return { error: "Email already verified" };

  user.isVerified = true;
  await user.save();

  return { message: "Email verified successfully" };
};

// Logout
export const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } }, { new: true });
  return { message: "Logged out successfully" };
};

// Refresh token
export const refreshTokenService = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) return { error: "Unauthorized request" };

  const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  const user = await User.findById(decodedToken?._id);

  if (!user) return { error: "Invalid refresh token" };
  if (incomingRefreshToken !== user.refreshToken) {
    return { error: "Refresh token is expired or invalid" };
  }

  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save();
  return { accessToken, refreshToken };
};

// Send reset password email
export const sendResetPasswordEmail = async (email) => {
  const user = await User.findOne({ email });
  if (!user) return { error: "Email does not exist" };

  const resetToken = jwt.sign(
    { _id: user._id },
    process.env.RESET_TOKEN_SECRET,
    { expiresIn: "10m" }
  );

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
  });

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Link",
      text: `http://localhost:3000/updatePassword/${resetToken}`,
    };

    await transporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully");
    return { message: "Password reset link sent to email" };
  } catch (emailError) {
    console.error("Password reset email sending failed:", emailError);
    return { 
      error: "Failed to send password reset email. Please try again later.",
      details: emailError.message
    };
  }
};

// Update password
export const updateUserPassword = async (resetToken, password) => {
  const decoded = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET);
  const user = await User.findById(decoded._id);

  if (!user) return { error: "User not found" };

  const hashedPassword = await bcrypt.hash(password, 10);
  user.password = hashedPassword;
  await user.save();

  return { message: "Password updated successfully" };
};
