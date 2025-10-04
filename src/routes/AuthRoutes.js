import { Router } from "express";
import { login, Signup, logout, resetPassword, updatePassword , verifyEmail , refreshAccessToken } from "../controllers/authController.js";
import { jwtVerify } from "../middlewares/AuthChecker.js";

const router = Router();

router.route("/login").post(login);
router.route("/signup").post(Signup);
router.route("/verify-email/:token").get(verifyEmail);
router.route("/logout").post(jwtVerify, logout);
router.route("/reset-password").post(resetPassword);
router.route("/update-password/:resetToken").post( updatePassword);
router.route("/refresh-token").post(refreshAccessToken);

router.route("/verify").post(jwtVerify ,  (req,res) => {
    return res
    .status(200)
    .json({ success: true, message: "User is verified" });
});

export default router;
