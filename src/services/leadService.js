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
    const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { customerName: true, source: true } });
    const leadIdentifier = `${lead?.source ?? ''} - ${lead?.customerName ?? ''}`.trim();
    await logActivity(tx, {
      userId: assignedById,
      leadId,
      leadIdentifier,
      action: 'UPDATED',
      details: `Assigned to ${users.map(u => u.name).join(', ')}`,
    });

    return assignments;
  });
};

// Remove a single assignee from a lead
export const unassignUserFromLead = async (leadId, userId, unassignedById) => {
  return await prisma.$transaction(async (tx) => {
    await tx.leadAssignment.deleteMany({ where: { leadId, userId } });

    const user = await tx.user.findUnique({ where: { id: userId }, select: { name: true } });
    const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { customerName: true, source: true } });
    const leadIdentifier = `${lead?.source ?? ''} - ${lead?.customerName ?? ''}`.trim();
    await logActivity(tx, {
      userId: unassignedById,
      leadId,
      leadIdentifier,
      action: 'UPDATED',
      details: `Unassigned ${user?.name ?? userId}`,
    });

    return { leadId, userId };
  });
};

// Get assignments for a lead
export const getAssignmentsForLead = async (leadId) => {
  const assignments = await prisma.leadAssignment.findMany({
    where: { leadId, active: true },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      assignedByUser: { select: { id: true, name: true, role: true } },
    },
  });
  return assignments;
};

// List all current assignments (admin+)
export const listAllAssignments = async () => {
  const assignments = await prisma.leadAssignment.findMany({
    where: { active: true },
    include: {
      lead: { select: { id: true, source: true, customerName: true } },
      user: { select: { id: true, name: true, email: true, avatar: true } },
      assignedByUser: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return assignments;
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
      const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { customerName: true, source: true } });
      const leadIdentifier = `${lead?.source ?? ''} - ${lead?.customerName ?? ''}`.trim();
      await logActivity(tx, {
        userId: assignedById,
        leadId,
        leadIdentifier,
        action: 'UPDATED',
        details: `Bulk assigned to ${users.map(u => u.name).join(', ')}`,
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
