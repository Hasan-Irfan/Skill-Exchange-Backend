// src/middlewares/roleChecker.js
export const roleChecker = (requiredRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const hasRequiredRole = requiredRoles.includes(userRole);
    if (hasRequiredRole) {
      next();
    } else {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
  };
};
