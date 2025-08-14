const ROLE_LEVELS = {
  employee: 1,
  admin: 2,
  "super admin": 3
};

export const authorizeRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    const minLevel = ROLE_LEVELS[minRole];

    if (userLevel < minLevel) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};
