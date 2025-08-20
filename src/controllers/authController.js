import prisma from '../config/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

    // update login timestamps
    await prisma.user.update({
      where: { id: user.id },
      data: {
        previousLogin: user.lastLogin, // shift old one here
        lastLogin: new Date(),         // set new one
      },
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,        // most recent (before updating)
        previousLogin: user.previousLogin // available after first migration
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};


export const register = async (req, res) => {
  const { name, email,phone, password, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashed,
        role: role || "employee",
      },
    });
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register Error:", err);
    // Unique email constraint friendly message:
    if (err.code === 'P2002') return res.status(400).json({ error: "Email already in use" });
    res.status(400).json({ error: err.message });
  }
};
