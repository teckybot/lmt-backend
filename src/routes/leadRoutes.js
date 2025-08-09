const express = require("express");
const router = express.Router();
const { createLead, getLeads, updateLeadStatus, updateLead, deleteLead, } = require("../controllers/leadController");
const authenticateToken = require("../middleware/authMiddleware");

const { getAnalytics } = require("../controllers/analyticsController");

router.get("/analytics", authenticateToken, getAnalytics);
router.post("/", authenticateToken, createLead);
router.get("/", authenticateToken, getLeads);
// router.post("/assign", authenticateToken, assignLead);
router.put("/status/:id", authenticateToken, updateLeadStatus);
router.put("/:id", authenticateToken, updateLead);
router.delete("/:id", authenticateToken, deleteLead);
// router.get("/assigned", authenticateToken, getAssignedLeads); // New route

module.exports = router;