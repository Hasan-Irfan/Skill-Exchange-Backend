import {
  getUserNotificationsService,
  markNotificationReadService,
  markAllNotificationsReadService
} from "../services/notificationQueryService.js";

export const getNotifications = async (req, res) => {
  try {
    const { limit, beforeCreatedAt, beforeId } = req.query;
    const notifications = await getUserNotificationsService(req.user.id, {
      limit: Number(limit) || 20,
      before: beforeCreatedAt && beforeId ? { createdAt: new Date(beforeCreatedAt), id: beforeId } : undefined
    });
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await markNotificationReadService(req.user.id, req.params.id);
    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await markAllNotificationsReadService(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

