const express = require("express");
const {
  createLead,
  getLeads,
  updateLeadStatus,
  updateLead,      // ✅ import controller
  deleteLead       // ✅ import controller
} = require("../controllers/leadController");

const { getAnalytics } = require("../controllers/analyticsController");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", verifyToken, createLead);
router.get("/", verifyToken, getLeads);
router.put("/:id/status", verifyToken, updateLeadStatus);
router.get("/analytics", verifyToken, getAnalytics);

// ✅ Use controller functions instead of writing logic here
router.put("/:id", verifyToken, updateLead);
router.delete("/:id", verifyToken, deleteLead);

module.exports = router;
