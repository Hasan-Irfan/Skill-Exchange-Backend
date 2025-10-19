import express from "express";
import { categorySchema, skillSchema } from "../validations/categoryValidations.js";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { roleChecker } from "../middlewares/RoleChecker.js";
import { validateRequest } from "../middlewares/validate.js";
import { 
  getCategories, 
  getCategoryById,
  createCategory, 
  updateCategory,
  deleteCategory,
  getSkills, 
  getSkillsByCategory,
  createSkill,
  updateSkill,
  deleteSkill
} from "../controllers/categoryController.js";

const router = express.Router();

// ---------- Category Routes ----------
router.get("/categories", getCategories);
router.get("/categories/:id", getCategoryById);
router.post("/categories", jwtVerify, roleChecker(["admin"]), validateRequest(categorySchema), createCategory);
router.put("/categories/:id", jwtVerify, roleChecker(["admin"]), validateRequest(categorySchema), updateCategory);
router.delete("/categories/:id", jwtVerify, roleChecker(["admin"]), deleteCategory);

// ---------- Skill Routes ----------
router.get("/skills", getSkills);
router.get("/skills/category/:categoryId", getSkillsByCategory);
router.post("/skills", jwtVerify, roleChecker(["admin"]), validateRequest(skillSchema), createSkill);
router.put("/skills/:id", jwtVerify, roleChecker(["admin"]), validateRequest(skillSchema), updateSkill);
router.delete("/skills/:id", jwtVerify, roleChecker(["admin"]), deleteSkill);

export default router;
