import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// User Login
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Update login timestamps
    await prisma.user.update({
      where: { id: user.id },
      data: {
        previousLogin: user.lastLogin,
        lastLogin: new Date(),
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        previousLogin: user.previousLogin,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// User Registration
export const register = async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (!password || !email) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: role || "employee",
      },
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register Error:", err);
    if (err.code === 'P2002') {
      return res.status(400).json({ error: "Email already in use" });
    }
    return res.status(400).json({ error: err.message });
  }
};


// Reset own password (current + new)
export const resetPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Current and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters long",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }, // ✅ Fixed: was missing `data:`
    });

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
};

// Admin force reset any user's password
export const forceResetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // Authorization check
    if (req.user.role !== 'admin' && req.user.role !== 'super admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    // Input validation
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }, // Only check existence
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }, // ✅ Fixed: was missing `data:`
    });

    return res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Force password reset error:", error);
    return res.status(500).json({ error: "Failed to reset password" });
  }
};