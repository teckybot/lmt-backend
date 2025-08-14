import express from "express";
import {
  createLead,
  getLeads,
  updateLeadStatus,
  updateLead,
  deleteLead
} from "../controllers/leadController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Any logged-in user
router.post("/", authenticateToken, createLead);
router.get("/", authenticateToken, getLeads);
router.patch("/:id/status", authenticateToken, updateLeadStatus);
router.put("/:id", authenticateToken, updateLead);

// Only admin or super admin
router.delete("/:id", authenticateToken, authorizeRole("admin"), deleteLead);

export default router;
