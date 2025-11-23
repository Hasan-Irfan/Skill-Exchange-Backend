import {
  createReportService,
  getUserReportsService,
  getReportService
} from "../services/reportService.js";

/**
 * Create a new report
 */
export const createReport = async (req, res) => {
  try {
    const report = await createReportService(req.user.id, req.body);
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get user's own reports
 */
export const getUserReports = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      type: req.query.type,
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0,
      sortBy: req.query.sortBy || "createdAt",
      sortOrder: req.query.sortOrder === "asc" ? 1 : -1
    };
    const result = await getUserReportsService(req.user.id, filters);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get single report (user can only see their own)
 */
export const getReport = async (req, res) => {
  try {
    const report = await getReportService(req.params.id, req.user.id);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

