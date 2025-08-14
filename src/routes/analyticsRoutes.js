import express from "express";
import { getAnalytics } from "../controllers/analyticsController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected
router.get("/", authenticateToken, getAnalytics);

export default router;
