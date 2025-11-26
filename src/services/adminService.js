import mongoose from "mongoose";
import User from "../model/user.model.js";
import Report from "../model/report.model.js";
import Exchange from "../model/exchange.model.js";
import Payment from "../model/payment.model.js";
import Listing from "../model/listing.model.js";
import { refundPaymentService, captureEscrowPaymentService } from "./paymentService.js";
import { sendExchangeNotification, sendUserNotification } from "./notificationService.js";

/**
 * Check if user is superAdmin
 */
const isSuperAdmin = (user) => {
  return Array.isArray(user?.roles) && user.roles.includes("superAdmin");
};

/**
 * Check if user is admin or superAdmin
 */
const isAdmin = (user) => {
  return Array.isArray(user?.roles) && (user.roles.includes("admin") || user.roles.includes("superAdmin"));
};

/**
 * Create or update admin role
 * Only superAdmin can perform this action
 */
export const manageAdminRoleService = async (superAdminId, targetUserId, action, role = null) => {
  const session = await mongoose.startSession();
  let out;
  let notificationPayload = null;
  
  await session.withTransaction(async () => {
    const superAdmin = await User.findById(superAdminId).session(session);
    if (!superAdmin || !isSuperAdmin(superAdmin)) {
      throw new Error("Only superAdmin can manage admin roles");
    }

    const targetUser = await User.findById(targetUserId).session(session);
    if (!targetUser) throw new Error("Target user not found");

    if (action === "promote") {
      // Promote user to admin
      if (targetUser.roles.includes("admin") || targetUser.roles.includes("superAdmin")) {
        throw new Error("User is already an admin");
      }
      if (!targetUser.roles.includes("admin")) {
        targetUser.roles.push("admin");
      }
    } else if (action === "demote") {
      // Remove admin role
      if (targetUser.roles.includes("superAdmin")) {
        throw new Error("Cannot demote superAdmin");
      }
      targetUser.roles = targetUser.roles.filter(role => role !== "admin");
    } else if (action === "update") {
      // Update to specific role
      if (!role || !["user", "admin"].includes(role)) {
        throw new Error("Invalid role. Must be 'user' or 'admin'");
      }
      if (targetUser.roles.includes("superAdmin")) {
        throw new Error("Cannot modify superAdmin role");
      }
      targetUser.roles = [role];
    } else {
      throw new Error("Invalid action. Must be 'promote', 'demote', or 'update'");
    }

    await targetUser.save({ session });
    out = targetUser.toObject();

    if (action === "promote") {
      notificationPayload = {
        title: "Admin privileges granted",
        body: "You have been promoted to admin by the super admin.",
        data: { roles: out.roles, action: "promote" }
      };
    } else if (action === "demote") {
      notificationPayload = {
        title: "Admin role removed",
        body: "Your admin privileges have been revoked.",
        data: { roles: out.roles, action: "demote" }
      };
    } else if (action === "update") {
      notificationPayload = {
        title: "Role updated",
        body: `Your account role has been updated to ${role}.`,
        data: { roles: out.roles, action: "update" }
      };
    }
  });
  
  session.endSession();
  if (out && notificationPayload) {
    await sendUserNotification(out._id, notificationPayload.title, notificationPayload.body, notificationPayload.data);
  }
  return out;
};

/**
 * Block or suspend user
 * superAdmin and admin can perform this action
 */
export const manageUserStatusService = async (adminId, targetUserId, action, data = {}) => {
  const session = await mongoose.startSession();
  let out;
  let notificationPayload = null;
  
  await session.withTransaction(async () => {
    const admin = await User.findById(adminId).session(session);
    if (!admin || !isAdmin(admin)) {
      throw new Error("Only admins can manage user status");
    }

    const targetUser = await User.findById(targetUserId).session(session);
    if (!targetUser) throw new Error("Target user not found");

    // Prevent blocking admins (only superAdmin can block other admins)
    if (targetUser.roles.includes("admin") && !isSuperAdmin(admin)) {
      throw new Error("Only superAdmin can block or suspend other admins");
    }

    if (targetUser.roles.includes("superAdmin")) {
      throw new Error("Cannot block or suspend superAdmin");
    }

    if (action === "block") {
      targetUser.status = "blocked";
      targetUser.suspension = {
        reason: data.reason || "Blocked by admin",
        suspendedBy: adminId,
        suspendedAt: new Date(),
        suspendedUntil: null,
        isPermanent: true
      };
      notificationPayload = {
        title: "Account blocked",
        body: data.reason || "Your account has been blocked by an administrator.",
        data: { action: "block" }
      };
    } else if (action === "suspend") {
      if (!data.duration || !data.durationUnit) {
        throw new Error("Duration and durationUnit are required for suspension");
      }

      const durationMs = {
        hours: data.duration * 60 * 60 * 1000,
        days: data.duration * 24 * 60 * 60 * 1000,
        weeks: data.duration * 7 * 24 * 60 * 60 * 1000,
        months: data.duration * 30 * 24 * 60 * 60 * 1000
      };

      if (!durationMs[data.durationUnit]) {
        throw new Error("Invalid durationUnit. Must be: hours, days, weeks, or months");
      }

      const suspendedUntil = new Date(Date.now() + durationMs[data.durationUnit]);
      targetUser.status = "suspended";
      targetUser.suspension = {
        reason: data.reason || "Suspended by admin",
        suspendedBy: adminId,
        suspendedAt: new Date(),
        suspendedUntil: suspendedUntil,
        isPermanent: false
      };
      notificationPayload = {
        title: "Account suspended",
        body: `${data.reason || "You have been suspended by an administrator."} ${data.duration ? `Duration: ${data.duration} ${data.durationUnit}` : ""}`.trim(),
        data: { action: "suspend", suspendedUntil }
      };
    } else if (action === "unblock" || action === "unsuspend") {
      targetUser.status = "active";
      targetUser.suspension = undefined;
      notificationPayload = {
        title: "Access restored",
        body: "Your account access has been restored. You can now log in again.",
        data: { action }
      };
    } else {
      throw new Error("Invalid action. Must be 'block', 'suspend', 'unblock', or 'unsuspend'");
    }

    await targetUser.save({ session });
    out = targetUser.toObject();
  });
  
  session.endSession();
  if (out && notificationPayload) {
    await sendUserNotification(out._id, notificationPayload.title, notificationPayload.body, notificationPayload.data);
  }
  return out;
};

/**
 * Get all reports with filtering
 */
export const getReportsService = async (filters = {}) => {
  const {
    status,
    type,
    priority,
    assignedTo,
    reporter,
    againstUser,
    exchange,
    limit = 50,
    skip = 0,
    sortBy = "createdAt",
    sortOrder = -1
  } = filters;

  const query = {};
  if (status) query.status = status;
  if (type) query.type = type;
  if (priority) query.priority = priority;
  if (assignedTo) query.assignedTo = assignedTo;
  if (reporter) query.reporter = reporter;
  if (againstUser) query.againstUser = againstUser;
  if (exchange) query.exchange = exchange;

  const sort = { [sortBy]: sortOrder === 1 ? 1 : -1 };

  const reports = await Report.find(query)
    .populate("reporter", "username email avatarUrl")
    .populate("againstUser", "username email avatarUrl status")
    .populate("exchange", "status type")
    .populate("assignedTo", "username email")
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Report.countDocuments(query);

  return { reports, total, limit, skip };
};

/**
 * Get single report by ID
 */
export const getReportService = async (reportId) => {
  const report = await Report.findById(reportId)
    .populate("reporter", "username email avatarUrl")
    .populate("againstUser", "username email avatarUrl status")
    .populate("exchange", "status type monetary")
    .populate("assignedTo", "username email")
    .lean();

  if (!report) throw new Error("Report not found");
  return report;
};

/**
 * Assign report to admin
 */
export const assignReportService = async (adminId, reportId) => {
  const session = await mongoose.startSession();
  let out;
  let reporterToNotify = null;
  
  await session.withTransaction(async () => {
    const admin = await User.findById(adminId).session(session);
    if (!admin || !isAdmin(admin)) {
      throw new Error("Only admins can assign reports");
    }

    const report = await Report.findById(reportId).session(session);
    if (!report) throw new Error("Report not found");

    report.assignedTo = adminId;
    if (report.status === "open") {
      report.status = "under_review";
    }
    report.audit = report.audit || [];
    report.audit.push({
      at: new Date(),
      by: adminId,
      action: "assigned",
      note: `Assigned to admin`
    });

    reporterToNotify = report.reporter;
    await report.save({ session });
    out = report.toObject();
  });
  
  session.endSession();
  if (out && reporterToNotify) {
    await sendUserNotification(
      reporterToNotify,
      "Report under review",
      "An administrator has started reviewing your report.",
      { reportId: out._id }
    );
  }
  return out;
};

/**
 * Update report status and add admin notes
 */
export const updateReportService = async (adminId, reportId, updates) => {
  const session = await mongoose.startSession();
  let out;
  let reporterToNotify = null;
  let reporterMessage = null;
  
  await session.withTransaction(async () => {
    const admin = await User.findById(adminId).session(session);
    if (!admin || !isAdmin(admin)) {
      throw new Error("Only admins can update reports");
    }

    const report = await Report.findById(reportId).session(session);
    if (!report) throw new Error("Report not found");

    if (updates.status) {
      if (!["open", "under_review", "resolved", "rejected", "escalated"].includes(updates.status)) {
        throw new Error("Invalid status");
      }
      report.status = updates.status;
    }

    if (updates.priority) {
      if (!["low", "medium", "high", "urgent"].includes(updates.priority)) {
        throw new Error("Invalid priority");
      }
      report.priority = updates.priority;
    }

    if (updates.adminNotes !== undefined) {
      report.adminNotes = updates.adminNotes;
    }

    if (updates.resolution !== undefined) {
      report.resolution = updates.resolution;
    }

    if (updates.actionTaken) {
      if (!["none", "warning", "suspend", "block", "refund", "chargeback"].includes(updates.actionTaken)) {
        throw new Error("Invalid actionTaken");
      }
      report.actionTaken = updates.actionTaken;
    }

    if (updates.evidence && Array.isArray(updates.evidence)) {
      report.evidence = updates.evidence;
    }

    report.audit = report.audit || [];
    report.audit.push({
      at: new Date(),
      by: adminId,
      action: "updated",
      note: updates.note || "Report updated by admin"
    });

    reporterToNotify = report.reporter;
    const statusMsg = updates.status ? `Status updated to ${updates.status}.` : "";
    const resolutionMsg = updates.resolution ? `Resolution: ${updates.resolution}.` : "";
    const actionMsg = updates.actionTaken ? `Action taken: ${updates.actionTaken}.` : "";
    reporterMessage = [statusMsg, resolutionMsg, actionMsg].filter(Boolean).join(" ").trim();

    await report.save({ session });
    out = report.toObject();
  });
  
  session.endSession();
  if (out && reporterToNotify) {
    await sendUserNotification(
      reporterToNotify,
      "Report updated",
      reporterMessage || "An administrator updated your report.",
      { reportId: out._id }
    );
  }
  return out;
};

/**
 * Admin resolve dispute with payment control
 * Only admins can perform this action
 */
export const adminResolveDisputeService = async (adminId, exchangeId, resolution = {}) => {
  const session = await mongoose.startSession();
  let out;
  
  await session.withTransaction(async () => {
    const admin = await User.findById(adminId).session(session);
    if (!admin || !isAdmin(admin)) {
      throw new Error("Only admins can resolve disputes");
    }

    const exchange = await Exchange.findById(exchangeId).session(session);
    if (!exchange) throw new Error("Exchange not found");

    if (exchange.status !== "disputed") {
      throw new Error("Exchange is not in disputed status");
    }

    const isMonetaryExchange = ["monetary", "hybrid"].includes(exchange.type);
    if (isMonetaryExchange && !resolution.paymentAction) {
      throw new Error("paymentAction is required for monetary or hybrid disputes");
    }

    // Update exchange status
    exchange.status = "resolved";
    exchange.audit.push({
      at: new Date(),
      by: adminId,
      action: "admin_resolved_dispute",
      note: resolution.note || "Dispute resolved by admin"
    });

    // Handle payment based on resolution
    if (exchange.monetary?.escrowPaymentId && resolution.paymentAction) {
      try {
        if (resolution.paymentAction === "release") {
          // Release to payee (winner)
          const listing = await Listing.findById(exchange.request.listing).session(session);
          let correctPayee;
          if (listing) {
            if (listing.type === "offer") {
              correctPayee = exchange.receiver;
            } else if (listing.type === "need") {
              correctPayee = exchange.initiator;
            } else {
              correctPayee = exchange.receiver;
            }
          } else {
            correctPayee = resolution.payeeId || exchange.receiver;
          }

          await captureEscrowPaymentService(
            exchange.monetary.escrowPaymentId,
            correctPayee,
            adminId,
            session
          );
        } else if (resolution.paymentAction === "refund") {
          // Refund to payer
          await refundPaymentService(
            exchange.monetary.escrowPaymentId,
            resolution.reason || "Refunded by admin due to dispute resolution",
            adminId,
            true, // isAdmin = true
            false, // allowCancellation = false (already disputed)
            session
          );
        } else if (resolution.paymentAction === "split") {
          // Split payment (custom logic - you may need to implement this)
          // For now, we'll just log it
          exchange.audit.push({
            at: new Date(),
            by: adminId,
            action: "payment_split_requested",
            note: `Payment split requested: ${resolution.splitNote || "No details"}`
          });
        }
      } catch (err) {
        console.error(`Failed to handle payment action during dispute resolution: ${err.message}`);
        // Don't fail the dispute resolution if payment action fails
      }
    }

    await exchange.save({ session });
    out = exchange.toObject();
  });
  
  session.endSession();
  if (out) {
    await sendExchangeNotification(out, "admin_resolved_dispute", adminId);
  }
  return out;
};

/**
 * Admin payment intervention
 * Only admins can perform this action
 */
export const adminPaymentInterventionService = async (adminId, exchangeId, paymentId, action, data = {}) => {
  const session = await mongoose.startSession();
  let out;
  
  await session.withTransaction(async () => {
    const admin = await User.findById(adminId).session(session);
    if (!admin || !isAdmin(admin)) {
      throw new Error("Only admins can intervene in payments");
    }

    const exchange = await Exchange.findById(exchangeId).session(session);
    if (!exchange) throw new Error("Exchange not found");

    if (!exchange.monetary?.escrowPaymentId) {
      throw new Error("No escrow payment found for this exchange");
    }

    if (String(exchange.monetary.escrowPaymentId) !== String(paymentId)) {
      throw new Error("Payment ID does not match exchange escrow payment");
    }

    if (action === "release") {
      // Release payment to payee
      const listing = await Listing.findById(exchange.request.listing).session(session);
      let correctPayee = data.payeeId;
      
      if (!correctPayee && listing) {
        if (listing.type === "offer") {
          correctPayee = exchange.receiver;
        } else if (listing.type === "need") {
          correctPayee = exchange.initiator;
        } else {
          correctPayee = exchange.receiver;
        }
      }

      if (!correctPayee) {
        throw new Error("Payee ID is required for release action");
      }

      await captureEscrowPaymentService(
        paymentId,
        correctPayee,
        adminId,
        session
      );

      exchange.audit.push({
        at: new Date(),
        by: adminId,
        action: "admin_payment_released",
        note: data.reason || "Payment released by admin"
      });
    } else if (action === "refund") {
      // Refund payment to payer
      await refundPaymentService(
        paymentId,
        data.reason || "Refunded by admin",
        adminId,
        true, // isAdmin = true
        true, // allowCancellation = true
        session
      );

      exchange.audit.push({
        at: new Date(),
        by: adminId,
        action: "admin_payment_refunded",
        note: data.reason || "Payment refunded by admin"
      });
    } else if (action === "hold") {
      // Hold payment (mark for review)
      exchange.audit.push({
        at: new Date(),
        by: adminId,
        action: "admin_payment_held",
        note: data.reason || "Payment held by admin for review"
      });
    } else {
      throw new Error("Invalid action. Must be 'release', 'refund', or 'hold'");
    }

    await exchange.save({ session });
    out = exchange.toObject();
  });
  
  session.endSession();
  if (out) {
    await sendExchangeNotification(out, "admin_payment_intervention", adminId);
  }
  return out;
};

/**
 * Get all users with filtering (admin only)
 */
export const getUsersService = async (filters = {}) => {
  const {
    status,
    role,
    search,
    limit = 50,
    skip = 0,
    sortBy = "createdAt",
    sortOrder = -1
  } = filters;

  const query = {};
  if (status) query.status = status;
  if (role) {
    query.roles = role;
  }
  if (search) {
    query.$or = [
      { username: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  const sort = { [sortBy]: sortOrder === 1 ? 1 : -1 };

  const users = await User.find(query)
    .select("-password -refreshToken")
    .populate("suspension.suspendedBy", "username email")
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await User.countDocuments(query);

  return { users, total, limit, skip };
};

/**
 * Get user details by ID (admin only)
 */
export const getUserDetailsService = async (userId) => {
  const user = await User.findById(userId)
    .select("-password -refreshToken")
    .populate("suspension.suspendedBy", "username email")
    .lean();

  if (!user) throw new Error("User not found");
  return user;
};

/**
 * Get admin dashboard statistics
 */
export const getAdminDashboardService = async () => {
  const [
    totalUsers,
    activeUsers,
    blockedUsers,
    suspendedUsers,
    totalReports,
    openReports,
    underReviewReports,
    totalExchanges,
    disputedExchanges,
    totalPayments,
    pendingPayments
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ status: "active" }),
    User.countDocuments({ status: "blocked" }),
    User.countDocuments({ status: "suspended" }),
    Report.countDocuments({}),
    Report.countDocuments({ status: "open" }),
    Report.countDocuments({ status: "under_review" }),
    Exchange.countDocuments({}),
    Exchange.countDocuments({ status: "disputed" }),
    Payment.countDocuments({}),
    Payment.countDocuments({ status: "pending" })
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      blocked: blockedUsers,
      suspended: suspendedUsers
    },
    reports: {
      total: totalReports,
      open: openReports,
      underReview: underReviewReports
    },
    exchanges: {
      total: totalExchanges,
      disputed: disputedExchanges
    },
    payments: {
      total: totalPayments,
      pending: pendingPayments
    }
  };
};

