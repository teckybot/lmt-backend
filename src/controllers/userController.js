import prisma from '../config/db.js';

export const getUsers = async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, role: true },
    });
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { name, email },
    });
    res.json({ message: "Profile updated", user });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: "User not found" });
    if (err.code === 'P2002') return res.status(400).json({ message: "Email already in use" });
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Error updating profile" });
  }
};

export const getActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const activity = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(activity);
  } catch (err) {
    console.error("Get activity error:", err);
    res.status(500).json({ message: "Error fetching activity" });
  }
};
