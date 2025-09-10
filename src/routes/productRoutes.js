// src/routes/productRoutes.js
import express from "express";
import { createProduct, updateProduct, deleteProduct, listProducts, getProduct } from "../controllers/productController.js";
import { productCreateSchema, productUpdateSchema } from "../validations/productValidator.js";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { validateRequest }  from "../middlewares/validate.js";
import { roleChecker } from "../middlewares/RoleChecker.js";

const router = express.Router();

router.post("/", jwtVerify , validateRequest(productCreateSchema), roleChecker(["Vendor"]) , createProduct);
router.put("/:id", jwtVerify, validateRequest(productUpdateSchema), roleChecker(["Vendor"]) , updateProduct);
router.delete("/:id",jwtVerify ,  roleChecker(["Vendor"]) , deleteProduct);
router.get("/", jwtVerify, listProducts);
router.get("/:id", jwtVerify , getProduct);

export default router;
