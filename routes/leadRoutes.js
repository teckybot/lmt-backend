const express = require("express");
const {
  createLead,
  getLeads,
  updateLeadStatus,
} = require("../controllers/leadController");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", verifyToken, createLead);
router.get("/", verifyToken, getLeads);
router.put("/:id/status", verifyToken, updateLeadStatus); // ✅ only keep this




module.exports = router;
