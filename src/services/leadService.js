import prisma from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

// Assign a single lead to multiple users
export const assignLead = async (leadId, assigneeIds, assignedById) => {
  return await prisma.$transaction(async (tx) => {
    // Deactivate existing assignments
    await tx.leadAssignment.updateMany({
      where: { leadId, active: true },
      data: { active: false }
    });

    // Create new assignments
    const assignments = assigneeIds.map(userId => ({
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
      await tx.leadAssignment.updateMany({ where: { leadId, active: true }, data: { active: false } });

      const assignments = assigneeIds.map(userId => ({
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
  // Here you could insert into a ReassignmentRequest table or send a notification
  return `Reassignment request for lead "${lead.title}" sent to Super Admin`;
};
