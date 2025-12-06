import mongoose from "mongoose";
import Report from "../model/report.model.js";
import Exchange from "../model/exchange.model.js";
import User from "../model/user.model.js";

/**
 * Create a new report
 * Users can report exchanges they're involved in or other users
 */
// export const createReportService = async (reporterId, reportData) => {
//   const session = await mongoose.startSession();
//   let out;
  
//   await session.withTransaction(async () => {
//     const reporter = await User.findById(reporterId).session(session);
//     if (!reporter) throw new Error("Reporter not found");

//     // Check if reporter is blocked or suspended
//     if (reporter.status === "blocked" || reporter.status === "suspended") {
//       throw new Error("Blocked or suspended users cannot create reports");
//     }

//     // Validate againstUser exists
//     const againstUser = await User.findById(reportData.againstUser).session(session);
//     if (!againstUser) throw new Error("User being reported not found");

//     if (String(reporterId) === String(reportData.againstUser)) {
//       throw new Error("Cannot report yourself");
//     }

//     // If exchange is provided, validate reporter is involved
//     if (reportData.exchange) {
//       const exchange = await Exchange.findById(reportData.exchange).session(session);
//       if (!exchange) throw new Error("Exchange not found");

//       const uid = String(reporterId);
//       const isInitiator = String(exchange.initiator) === uid;
//       const isReceiver = String(exchange.receiver) === uid;

//       if (!isInitiator && !isReceiver) {
//         throw new Error("You can only report exchanges you are involved in");
//       }

//       // Validate againstUser is the other party in the exchange
//       const otherPartyId = isInitiator ? String(exchange.receiver) : String(exchange.initiator);
//       if (String(reportData.againstUser) !== otherPartyId) {
//         throw new Error("againstUser must be the other party in the exchange");
//       }
//     }

//     // Auto-set priority based on report type
//     let priority = "medium";
//     if (reportData.type === "fraud") {
//       priority = "urgent";
//     } else if (reportData.type === "abuse" || reportData.type === "payment") {
//       priority = "high";
//     } else if (reportData.type === "no_show") {
//       priority = "high";
//     }

//     const report = new Report({
//       reporter: reporterId,
//       againstUser: reportData.againstUser,
//       exchange: reportData.exchange || undefined,
//       type: reportData.type,
//       description: reportData.description,
//       priority: priority,
//       evidence: reportData.evidence || [],
//       status: "open",
//       audit: [{
//         at: new Date(),
//         by: reporterId,
//         action: "created",
//         note: "Report created by user"
//       }]
//     });

//     await report.save({ session });
//     out = report.toObject();
//   });
  
//   session.endSession();
//   return out;
// };
export const createReportService = async (reporterId, reportData) => {
  const session = await mongoose.startSession();
  let out;

  await session.withTransaction(async () => {
    const reporter = await User.findById(reporterId).session(session);
    if (!reporter) throw new Error("Reporter not found");

    if (reporter.status === "blocked" || reporter.status === "suspended") {
      throw new Error("Blocked or suspended users cannot create reports");
    }

    const againstUser = await User.findById(reportData.againstUser).session(session);
    if (!againstUser) throw new Error("User being reported not found");

    if (String(reporterId) === String(reportData.againstUser)) {
      throw new Error("Cannot report yourself");
    }

    if (reportData.exchange) {
      const exchange = await Exchange.findById(reportData.exchange).session(session);
      if (!exchange) throw new Error("Exchange not found");

      const uid = String(reporterId);
      const isInitiator = String(exchange.initiator) === uid;
      const isReceiver = String(exchange.receiver) === uid;

      if (!isInitiator && !isReceiver) {
        throw new Error("You can only report exchanges you are involved in");
      }

      const otherPartyId = isInitiator ? String(exchange.receiver) : String(exchange.initiator);
      if (String(reportData.againstUser) !== otherPartyId) {
        throw new Error("againstUser must be the other party in the exchange");
      }
    }

    let priority = "medium";
    if (reportData.type === "fraud") {
      priority = "urgent";
    } else if (
      reportData.type === "abuse" ||
      reportData.type === "payment" ||
      reportData.type === "no_show"
    ) {
      priority = "high";
    }

    const report = new Report({
      reporter: reporterId,
      againstUser: reportData.againstUser,
      exchange: reportData.exchange || undefined,
      type: reportData.type,
      description: reportData.description,
      priority,
      evidence: reportData.evidence || [],
      status: "open",
      audit: [
        {
          at: new Date(),
          by: reporterId,
          action: "created",
          note: "Report created by user",
        },
      ],
    });

    await report.save({ session });
    out = report.toObject();
  });

  session.endSession();
  return out;
};
/**
 * Get user's own reports
 */
export const getUserReportsService = async (userId, filters = {}) => {
  const {
    status,
    type,
    limit = 50,
    skip = 0,
    sortBy = "createdAt",
    sortOrder = -1,
  } = filters;

  const query = { reporter: userId };
  if (status) query.status = status;
  if (type) query.type = type;

  const sort = { [sortBy]: sortOrder === 1 ? 1 : -1 };

  const reports = await Report.find(query)
    .populate("againstUser", "username email avatarUrl")
    .populate("exchange", "status type")
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Report.countDocuments(query);

  return { reports, total, limit, skip };
};

/**
 * Get reports against a user (reports where user is the reported party)
 */
export const getReportsAgainstUserService = async (userId, filters = {}) => {
  const {
    status,
    type,
    limit = 50,
    skip = 0,
    sortBy = "createdAt",
    sortOrder = -1,
  } = filters;

  const query = { againstUser: userId };
  if (status) query.status = status;
  if (type) query.type = type;

  const sort = { [sortBy]: sortOrder === 1 ? 1 : -1 };

  const reports = await Report.find(query)
    .populate("reporter", "username email avatarUrl")
    .populate("exchange", "status type")
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Report.countDocuments(query);

  return { reports, total, limit, skip };
};

/**
 * Get single report by ID (user can see their own reports or reports against them)
 */
export const getUserReportService = async (reportId, userId) => {
  const report = await Report.findById(reportId)
    .populate("reporter", "username email avatarUrl")
    .populate("againstUser", "username email avatarUrl")
    .populate("exchange", "status type")
    .lean();

  if (!report) throw new Error("Report not found");

  // User can view if they are the reporter OR the reported user
  const isReporter = String(report.reporter._id || report.reporter) === String(userId);
  const isReportedUser = String(report.againstUser._id || report.againstUser) === String(userId);

  if (userId && !isReporter && !isReportedUser) {
    throw new Error("Unauthorized to view this report");
  }

  return report;
};

