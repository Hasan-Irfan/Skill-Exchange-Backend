import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import { updateProfileSchema, changePasswordSchema } from "../validations/userValidations.js";
import { upload } from "../middlewares/multer.js";
import { getProfile, updateProfile , getDashboard, changePassword } from "../controllers/userController.js";

const router = express.Router();

router.get("/users/:id", getProfile);
router.patch("/me", jwtVerify, upload.single('avatar'), validateRequest(updateProfileSchema), updateProfile);
router.get("/me/dashboard", jwtVerify , getDashboard);
router.patch("/me/password", jwtVerify, validateRequest(changePasswordSchema), changePassword);

export default router;
