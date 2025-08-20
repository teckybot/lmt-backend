import express from "express";
import {
  getUsers,
  createUser,
  updateUserById,
  deleteUserById,
  getProfile,
  updateProfile,
  getActivity,
  clearActivityHistory,
  getNotifications,
  markNotificationsRead,
  handleReassignRequest
} from "../controllers/userController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { authorizeRole } from "../middleware/roleMiddleware.js";
import { uploadAvatar } from "../middleware/upload.js"

const router = express.Router();

// Any logged-in user
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, uploadAvatar.single("avatar"), updateProfile);

// Only admin or above
router.get("/", authenticateToken, authorizeRole("admin"), getUsers);
router.post("/", authenticateToken, authorizeRole("super admin"), createUser);
router.put("/:id", authenticateToken, authorizeRole("super admin"), updateUserById);
router.delete("/:id", authenticateToken, authorizeRole("super admin"), deleteUserById);

// Any logged-in user
router.get("/activity", authenticateToken, getActivity);
// router.get("/activity/clear", authenticateToken, clearActivityHistory);

// Notifications
router.get("/notifications", authenticateToken, getNotifications);
router.post("/notifications/read", authenticateToken, markNotificationsRead);
router.post("/notifications/handle-reassign", authenticateToken, authorizeRole("super admin"), handleReassignRequest);

export default router;
