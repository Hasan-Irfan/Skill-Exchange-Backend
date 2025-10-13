import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { getThreads } from "../controllers/threadController.js";

const router = express.Router();

router.get("/threads", jwtVerify, getThreads);

export default router;


