import Notification from "../model/notification.model.js";

/**
 * List notifications for a user
 * Supports pagination via cursor (createdAt + _id) or simple skip/limit
 */
export const getUserNotificationsService = async (userId, { limit = 20, before } = {}) => {
  const query = { user: userId };

  if (before?.createdAt && before?.id) {
    query.$or = [
      { createdAt: { $lt: before.createdAt } },
      {
        createdAt: before.createdAt,
        _id: { $lt: before.id }
      }
    ];
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();

  return notifications;
};

export const markNotificationReadService = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
    { new: true }
  ).lean();
  if (!notification) {
    throw new Error("Notification not found");
  }
  return notification;
};

export const markAllNotificationsReadService = async (userId) => {
  await Notification.updateMany(
    { user: userId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } }
  );
  return { success: true };
};

