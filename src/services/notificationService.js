import Notification from "../model/notification.model.js";
import { getIO, getUserRoom } from "../utils/socket.js";

const ACTION_TEMPLATES = {
  created: {
    title: "New exchange proposal",
    body: (ctx) => `You have a new exchange request${ctx.listingTitle ? ` for "${ctx.listingTitle}"` : ""}.`,
  },
  accepted: {
    title: "Exchange accepted",
    body: (ctx) => `Your exchange${ctx.listingTitle ? ` for "${ctx.listingTitle}"` : ""} was accepted.`,
  },
  declined: {
    title: "Exchange declined",
    body: (ctx) => `Your exchange${ctx.listingTitle ? ` for "${ctx.listingTitle}"` : ""} was declined.`,
  },
  agreement_signed_by_user: {
    title: "Agreement signed",
    body: () => "The other party signed the agreement.",
  },
  agreement_fully_signed: {
    title: "Agreement completed",
    body: () => "Both parties have signed the agreement.",
  },
  escrow_funded: {
    title: "Escrow funded",
    body: () => "Escrow has been funded. You can start the exchange.",
  },
  started: {
    title: "Exchange started",
    body: () => "Exchange is now in progress.",
  },
  confirmed_completion: {
    title: "Completion confirmed",
    body: () => "The other party confirmed completion.",
  },
  completed: {
    title: "Exchange completed",
    body: () => "Exchange has been marked as completed.",
  },
  cancelled: {
    title: "Exchange cancelled",
    body: () => "Exchange has been cancelled.",
  },
  disputed: {
    title: "Exchange disputed",
    body: () => "A dispute has been raised on this exchange.",
  },
  resolved: {
    title: "Exchange resolved",
    body: () => "The exchange dispute has been resolved.",
  },
};

const uniqueObjectIdStrings = (ids = []) => [...new Set(ids.filter(Boolean).map(String))];

const determineRecipients = (exchange, action, actorId) => {
  const initiator = String(exchange.initiator);
  const receiver = String(exchange.receiver);
  const otherParty = (userId) => (userId === initiator ? receiver : initiator);

  switch (action) {
    case "created":
      return [receiver];
    case "accepted":
    case "declined":
      return [initiator];
    case "agreement_signed_by_user":
      return [otherParty(String(actorId))];
    case "agreement_fully_signed":
    case "escrow_funded":
    case "started":
    case "completed":
    case "cancelled":
    case "resolved":
      return [initiator, receiver];
    case "confirmed_completion":
      return [otherParty(String(actorId))];
    case "disputed":
      return [otherParty(String(actorId))];
    default:
      return [];
  }
};

const buildTemplate = (action, ctx) => {
  const template = ACTION_TEMPLATES[action];
  if (!template) {
    return {
      title: "Exchange update",
      body: "There is an update on your exchange.",
    };
  }
  return {
    title: template.title,
    body: template.body(ctx),
  };
};

const emitNotifications = (notifications) => {
  const io = getIO();
  if (!io) return;
  notifications.forEach((notif) => {
    const room = getUserRoom(notif.user);
    if (room) {
      io.to(room).emit("notification:new", {
        _id: notif._id,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        data: notif.data,
        createdAt: notif.createdAt,
        readAt: notif.readAt || null,
      });
    }
  });
};

export const sendExchangeNotification = async (exchange, action, actorId, extraData = {}) => {
  try {
    if (!exchange?._id) return;
    const recipients = uniqueObjectIdStrings(determineRecipients(exchange, action, actorId));
    if (!recipients.length) return;

    const listingTitle = exchange?.request?.listingSnapshot?.title;
    const ctx = { listingTitle };
    const template = buildTemplate(action, ctx);

    const payloads = recipients.map((userId) => ({
      user: userId,
      type: "EXCHANGE_STATUS",
      title: template.title,
      body: template.body,
      data: {
        exchangeId: exchange._id,
        action,
        ...extraData,
      },
    }));

    const notifications = await Notification.insertMany(payloads);
    emitNotifications(notifications);
  } catch (err) {
    console.error(`Failed to send ${action} notification`, err);
  }
};

