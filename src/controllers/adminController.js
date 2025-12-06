import {
  manageAdminRoleService,
  manageUserStatusService,
  getReportsService,
  getReportService as getAdminReportService,
  updateReportService,
  adminResolveDisputeService,
  adminPaymentInterventionService,
  getUsersService,
  getUserDetailsService,
  getAdminDashboardService,
  getDisputedExchangesService
} from "../services/adminService.js";

/**
 * Manage admin roles (superAdmin only)
 */
export const manageAdminRole = async (req, res) => {
  try {
    const { targetUserId, action, role } = req.body;
    const user = await manageAdminRoleService(req.user.id, targetUserId, action, role);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Block or suspend user (admin/superAdmin)
 */
export const manageUserStatus = async (req, res) => {
  try {
    const { targetUserId, action, ...data } = req.body;
    const user = await manageUserStatusService(req.user.id, targetUserId, action, data);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get all reports (admin only)
 */
export const getReports = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      type: req.query.type,
      priority: req.query.priority,
      reporter: req.query.reporter,
      againstUser: req.query.againstUser,
      exchange: req.query.exchange,
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0,
      sortBy: req.query.sortBy || "createdAt",
      sortOrder: req.query.sortOrder === "asc" ? 1 : -1
    };
    const result = await getReportsService(filters);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get single report (admin only)
 */
export const getReport = async (req, res) => {
  try {
    const report = await getAdminReportService(req.params.id);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

/**
 * Update report (admin only)
 */
export const updateReport = async (req, res) => {
  try {
    const report = await updateReportService(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: report });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Admin resolve dispute
 */
export const adminResolveDispute = async (req, res) => {
  try {
    const exchange = await adminResolveDisputeService(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Admin payment intervention
 */
export const adminPaymentIntervention = async (req, res) => {
  try {
    const { exchangeId, paymentId, action, ...data } = req.body;
    const exchange = await adminPaymentInterventionService(req.user.id, exchangeId, paymentId, action, data);
    res.json({ success: true, data: exchange });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get all users (admin only)
 */
export const getUsers = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      role: req.query.role,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      skip: parseInt(req.query.skip) || 0,
      sortBy: req.query.sortBy || "createdAt",
      sortOrder: req.query.sortOrder === "asc" ? 1 : -1
    };
    const result = await getUsersService(filters);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Get user details (admin only)
 */
export const getUserDetails = async (req, res) => {
  try {
    const user = await getUserDetailsService(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

/**
 * Get admin dashboard statistics
 */
export const getAdminDashboard = async (req, res) => {
  try {
    const stats = await getAdminDashboardService();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getDisputedExchanges = async (req, res) => {
  try {
    const filters = {
      limit: parseInt(req.query.limit) || 20,
      skip: parseInt(req.query.skip) || 0
    };
    const result = await getDisputedExchangesService(filters);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

