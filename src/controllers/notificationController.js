import prisma from '../config/db.js';
import bcrypt from 'bcryptjs';

//Notifications
// GET NOTIFICATIONS FOR CURRENT USER
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

// MARK ALL NOTIFICATIONS AS READ
export const markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    // Mark everything as read EXCEPT pending reassignment requests
    const result = await prisma.notification.updateMany({
      where: {
        recipientId: userId,
        read: false,
        NOT: {
          AND: [
            { type: 'REASSIGN_REQUEST' },
            { status: 'PENDING' },
          ],
        },
      },
      data: { read: true },
    });
    res.json({ updated: result.count });
  } catch (err) {
    console.error('Mark notifications read error:', err);
    res.status(500).json({ message: 'Error updating notifications' });
  }
};

//Reassignment
// Super admin handles a reassignment request
export const handleReassignRequest = async (req, res) => {
  try {
    const superAdminId = req.user.id;
    if (req.user.role !== 'super admin') return res.status(403).json({ message: 'Forbidden' });

    const { notificationId, action } = req.body; // action: 'ACCEPT' | 'REJECT'
    const notification = await prisma.notification.findUnique({ where: { id: Number(notificationId) } });
    if (!notification || notification.type !== 'REASSIGN_REQUEST') {
      return res.status(404).json({ message: 'Request not found' });
    }

    const status = action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';

    // Update original notification with decision meta
    await prisma.notification.update({
      where: { id: notification.id },
      data: { status, actedById: superAdminId, read: true },
    });

    // Notify the requesting admin
    if (notification.requestedById) {
      await prisma.notification.create({
        data: {
          recipientId: notification.requestedById,
          leadId: notification.leadId ?? undefined,
          type: 'REASSIGN_DECISION',
          status,
          message: status === 'ACCEPTED' ? 'Your reassignment request was accepted' : 'Your reassignment request was rejected',
        },
      });
    }

    // If accepted, grant one-time permission for that admin and lead
    if (status === 'ACCEPTED' && notification.requestedById && notification.leadId) {
      await prisma.reassignPermission.create({
        data: {
          leadId: notification.leadId,
          adminId: notification.requestedById,
          grantedBy: superAdminId,
          used: false,
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Handle reassign request error:', err);
    res.status(500).json({ message: 'Failed to handle request' });
  }
};