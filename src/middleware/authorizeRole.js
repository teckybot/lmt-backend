// middleware/authorizeRole.js
const pool = require("../config/db");

module.exports = (allowedRoles) => async (req, res, next) => {
  try {
    const userRole = req.user.role; // Assumed from JWT decoded in authMiddleware
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};