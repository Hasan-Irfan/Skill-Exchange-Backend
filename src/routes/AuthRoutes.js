import { Router } from "express";
import { login, Signup, logout, resetPassword, updatePassword , verifyEmail } from "../controllers/authController.js";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { 
  validateRequest, 
  loginValidation, 
  signupValidation,
  resetPasswordEmailValidation, 
  updatePasswordValidation,
  logoutValidation 
} from "../validations/authValidations.js";

const router = Router();

// Login route with validation
router.route("/login").post(validateRequest(loginValidation), login);

// Signup route with validation
router.route("/signup").post(validateRequest(signupValidation), Signup);

// Email verification route with validation
router.route("/verify-email/:token").get(verifyEmail);

// Logout route with validation and authentication
router.route("/logout").post(jwtVerify, validateRequest(logoutValidation), logout);

// Reset password route with validation
router.route("/reset-password").post(validateRequest(resetPasswordEmailValidation), resetPassword);

// Update password route with validation
router.route("/update-password/:resetToken").post(validateRequest(updatePasswordValidation), updatePassword);

router.route("/verify").post(jwtVerify ,  (req,res) => {
    return res
    .status(200)
    .json({ success: true, message: "User is verified" });
});

export default router;
