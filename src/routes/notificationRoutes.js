import express from "express";
import { jwtVerify } from "../middlewares/AuthChecker.js";
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../controllers/notificationController.js";

const router = express.Router();

router.use(jwtVerify);

router.get("/notifications", getNotifications);
router.patch("/notifications/:id/read", markNotificationRead);
router.patch("/notifications/read-all", markAllNotificationsRead);

export default router;

