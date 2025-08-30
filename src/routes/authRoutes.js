import express from "express";
import { login, register, resetPassword, forceResetPassword } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public
router.post("/login", login);
router.post("/register", register)
router.post("/reset-password", authenticateToken, resetPassword);
router.post("/force-reset-password", authenticateToken, forceResetPassword);

export default router;
