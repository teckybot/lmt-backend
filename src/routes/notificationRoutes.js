import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRole } from "../middleware/roleMiddleware.js";
import { uploadAvatar } from "../middleware/upload.js"
import { handleReassignRequest,getNotifications,markNotificationsRead } from "../controllers/notificationController.js";

const router = express.Router();

// Notifications
router.get("/notifications", authenticateToken, getNotifications);
router.post("/notifications/read", authenticateToken, markNotificationsRead);
router.post("/notifications/handle-reassign", authenticateToken, authorizeRole("super admin"), handleReassignRequest);

export default router;

