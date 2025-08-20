import prisma from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

// Assign a single lead to multiple users
export const assignLead = async (leadId, assigneeIds, assignedById) => {
  return await prisma.$transaction(async (tx) => {
    // Ensure no duplicates in input
    const uniqueAssigneeIds = Array.from(new Set(assigneeIds));

    // Replace existing assignments to satisfy unique constraint (leadId,userId)
    await tx.leadAssignment.deleteMany({ where: { leadId } });

    // Create new assignments
    const assignments = uniqueAssigneeIds.map(userId => ({
      leadId,
      userId,
      assignedBy: assignedById,
      active: true
    }));

    await tx.leadAssignment.createMany({ data: assignments });

    // Log activity
    const users = await tx.user.findMany({ where: { id: { in: assigneeIds } }, select: { name: true } });
    const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { title: true } });
    await logActivity({
      userId: assignedById,
      leadId,
      leadTitle: lead?.title,
      action: 'UPDATED',
      details: `Lead assigned to ${users.map(u => u.name).join(', ')}`,
    });

    return assignments;
  });
};

// Bulk assignment (multiple leads, multiple users) - Super Admin only
export const bulkAssignLeads = async (leadIds, assigneeIds, assignedById) => {
  return await prisma.$transaction(async (tx) => {
    const allAssignments = [];

    for (const leadId of leadIds) {
      // Remove all existing assignments for the lead
      await tx.leadAssignment.deleteMany({ where: { leadId } });

      const uniqueAssigneeIds = Array.from(new Set(assigneeIds));
      const assignments = uniqueAssigneeIds.map(userId => ({
        leadId,
        userId,
        assignedBy: assignedById,
        active: true
      }));

      await tx.leadAssignment.createMany({ data: assignments });

      const users = await tx.user.findMany({ where: { id: { in: assigneeIds } }, select: { name: true } });
      const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { title: true } });
      await logActivity({
        userId: assignedById,
        leadId,
        leadTitle: lead?.title,
        action: 'UPDATED',
        details: `Lead bulk assigned to ${users.map(u => u.name).join(', ')}`,
      });

      allAssignments.push(...assignments);
    }

    return allAssignments;
  });
};

// Admin requests reassignment from Super Admin
export const requestReassignment = async (leadId, requestedById) => {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });

  // Find all super admins
  const superAdmins = await prisma.user.findMany({ where: { role: 'super admin' }, select: { id: true } });
  if (superAdmins.length === 0) return `No super admins to notify`;

  // Send actionable notifications
  await prisma.$transaction(async (tx) => {
    const payload = superAdmins.map((u) => ({
      recipientId: u.id,
      message: `Reassign request for lead "${lead?.title ?? leadId}"`,
      leadId,
      type: 'REASSIGN_REQUEST',
      status: 'PENDING',
      requestedById,
    }));
    await tx.notification.createMany({ data: payload });
  });

  return `Reassignment request for lead "${lead?.title ?? leadId}" sent to Super Admins`;
};
