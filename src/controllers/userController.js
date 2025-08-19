import prisma from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

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

// GET USER ACTIVITY
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
        lead: { select: { title: true } }
      }
    });

    const formattedActivity = activity.map(act => ({
      id: act.id,
      username: act.user?.name || 'Unknown',
      action: act.action,
      details: act.details,
      leadTitle: act.lead?.title || null,
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
