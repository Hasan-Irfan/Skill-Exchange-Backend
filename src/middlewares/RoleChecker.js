// src/middlewares/roleChecker.js
export const roleChecker = (roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (roles.includes(userRole)) {
      next();
    } else {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
  };
};
