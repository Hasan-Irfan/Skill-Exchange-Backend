import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import { updateProfileSchema } from "../validations/userValidations.js";
import { upload } from "../middlewares/multer.js";
import { getProfile, updateProfile , getDashboard } from "../controllers/userController.js";

const router = express.Router();

router.get("/users/:id", getProfile);
router.patch("/me", jwtVerify, upload.single('avatar'), validateRequest(updateProfileSchema), updateProfile);
router.get("/me/dashboard", jwtVerify , getDashboard);

export default router;
