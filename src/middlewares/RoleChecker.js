// src/middlewares/roleChecker.js
export const roleChecker = (requiredRoles) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles;
    if (!userRoles || !Array.isArray(userRoles)) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    
    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (hasRequiredRole) {
      next();
    } else {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
  };
};
