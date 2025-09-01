import prisma from '../config/db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//CRUD USER MANAGEMENT
// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, avatar: true },
      orderBy: {
        id: "asc", 
      },
    });
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const usersWithFullAvatar = users.map(u => ({
      ...u,
      avatar: u.avatar ? `${baseUrl}${u.avatar}` : null,
    }));
    res.json(usersWithFullAvatar);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
};

// Create user
export const createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, phone, password: hashedPassword, role },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ message: "Error creating user" });
  }
};

// Update user
export const updateUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { name, email, phone, role },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    res.json(updatedUser);
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Error updating user" });
  }
};

// Delete user
export const deleteUserById = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Error deleting user" });
  }
};


//Profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatar: true,
        createdAt: true,
        lastLogin: true,
        previousLogin: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Build base URL
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

    // Convert the relative avatar path to a full URL
    const userWithFullAvatar = {
      ...user,
      avatar: user.avatar ? `${baseUrl}${user.avatar}` : null,
    };

    // New: Send the user object with the full URL
    res.json(userWithFullAvatar);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone } = req.body;

    // Fetch the current user data to check for an existing avatar
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    const data = { name, email };
    if (phone !== undefined) data.phone = phone;

    if (req.file) {
      // Logic to delete the old avatar file
      if (existingUser && existingUser.avatar) {
        const relativePath = existingUser.avatar.replace(/^\/+/, "");
        const oldAvatarPath = path.join(__dirname, "../uploads", relativePath);

        try {
          fs.unlinkSync(oldAvatarPath);
          console.log(`Old avatar deleted: ${oldAvatarPath}`);
        } catch (err) {
          console.error("Failed to delete old avatar:", err);
        }
      }



      // Set the new avatar path
      data.avatar = `/avatars/${req.file.filename}`;
    }

    // Update the user in the database with new data (including the new avatar path)
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    // Convert avatar to full URL before sending
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const userWithFullAvatar = {
      ...user,
      avatar: user.avatar ? `${baseUrl}${user.avatar}` : null,
    };

    res.json({ message: "Profile updated", user: userWithFullAvatar });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ message: "User not found" });
    if (err.code === "P2002")
      return res.status(400).json({ message: "Email already in use" });
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Error updating profile" });
  }
};



// USER ACTIVITY
export const getActivity = async (req, res) => {
  try {
    const userId = req.user.id;

    // Leads summary
    const leadsAdded = await prisma.lead.count({ where: { createdBy: userId } });
    const leadsClosed = await prisma.lead.count({ where: { closedBy: userId, status: 'Closed' } });

    // Detailed activity list
    const activity = await prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        lead: { select: { id: true, customerName: true } }
      }
    });

    const formattedActivity = activity.map(act => ({
      id: act.id,
      username: act.user?.name || 'Unknown',
      action: act.action,
      details: act.details,
      leadTitle: act.leadTitle || act.lead?.customerName || null,
      createdAt: act.createdAt
    }));

    res.json({
      summary: { leadsAdded, leadsClosed },
      activity: formattedActivity,
    });
  } catch (err) {
    console.error('Get activity error:', err);
    res.status(500).json({ message: 'Error fetching activity' });
  }
};

// CLEAR USER ACTIVITY HISTORY
export const clearActivityHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Prevent any logging while clearing
    req.skipLogging = true;

    const deleted = await prisma.userActivity.deleteMany({
      where: { userId }
    });

    res.status(200).json({ message: `Deleted ${deleted.count} activity entries.` });
  } catch (err) {
    console.error('Clear Activity History Error:', err);
    res.status(500).json({ message: 'Failed to clear history.' });
  }
};