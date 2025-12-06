// src/middlewares/roleChecker.js
export const roleChecker = (requiredRoles) => {
  return (req, res, next) => {
    // Check if user exists
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized - User not found" 
      });
    }

    // Get role from user (handle both Mongoose document and plain object)
    let userRole;
    if (req.user.role) {
      userRole = req.user.role;
    } else if (typeof req.user.toObject === 'function') {
      const userObj = req.user.toObject();
      userRole = userObj.role;
    }
    
    if (!userRole) {
      console.error('RoleChecker: No role found', {
        userId: req.user._id,
        hasUser: !!req.user,
        userType: typeof req.user,
        userKeys: req.user ? Object.keys(req.user).slice(0, 10) : 'no user'
      });
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized - User role not found" 
      });
    }
    
    // Check if user has required role
    const hasRequiredRole = requiredRoles.includes(userRole);
    
    if (!hasRequiredRole) {
      console.warn('RoleChecker: Access denied', {
        userRole,
        requiredRoles,
        userId: req.user._id?.toString()
      });
      return res.status(403).json({ 
        success: false, 
        message: `Access denied. Required role: ${requiredRoles.join(' or ')}, Your role: ${userRole}` 
      });
    }
    
    next();
  };
};
