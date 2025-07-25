const express = require("express");
const {
  createLead,
  getLeads,
  updateLeadStatus,
  updateLead,
  deleteLead
} = require("../controllers/leadController");

const { getAnalytics } = require("../controllers/analyticsController");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

// Lead CRUD routes
router.post("/", verifyToken, createLead);
router.get("/", verifyToken, getLeads);

// 🔁 Place this BEFORE "/:id"
router.put("/:id/status", verifyToken, updateLeadStatus);

// Analytics route
router.get("/analytics", verifyToken, getAnalytics);

// Lead update & delete
router.put("/:id", verifyToken, updateLead);
router.delete("/:id", verifyToken, deleteLead);

module.exports = router;
