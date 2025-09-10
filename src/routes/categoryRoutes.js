import express from "express";
import {createCategory , getCategories , updateCategory , deleteCategory} from "../controllers/categoryController.js";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { createCategoryValidation, updateCategoryValidation, deleteCategoryValidation } from "../validations/categoryValidations.js";
import { validateRequest } from "../middlewares/validate.js";
import { roleChecker } from "../middlewares/RoleChecker.js";

const router = express.Router();

router.post("/", jwtVerify, roleChecker(["Admin"]) , validateRequest(createCategoryValidation), createCategory);
router.get("/", jwtVerify, getCategories);
router.put("/:id", jwtVerify, roleChecker(["Admin"]) , validateRequest(updateCategoryValidation), updateCategory);
router.delete("/:id", jwtVerify, roleChecker(["Admin"]) , validateRequest(deleteCategoryValidation), deleteCategory);

export default router;
