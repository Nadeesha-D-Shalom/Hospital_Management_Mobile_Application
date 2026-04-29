const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    const userRole = String(req.user.role || '').toLowerCase();
    const normalizedRoles = allowedRoles.map((role) => String(role).toLowerCase());

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }

    next();
  };
};

module.exports = roleMiddleware;
