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


export default router;
