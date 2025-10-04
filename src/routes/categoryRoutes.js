import express from "express";
import { categorySchema, skillSchema } from "../validations/categoryValidations.js";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { roleChecker } from "../middlewares/RoleChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import { getCategories, createCategory, getSkills, createSkill } from "../controllers/categoryController.js";

const router = express.Router();

router.get("/categories", getCategories);
router.post("/create-categories", jwtVerify, roleChecker(["admin"]), validateRequest(categorySchema), createCategory);
router.get("/skills", getSkills);
router.post("/create-skills", jwtVerify, roleChecker(["admin"]), validateRequest(skillSchema), createSkill);

export default router;
