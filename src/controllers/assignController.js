import { assignLead, bulkAssignLeads, requestReassignment } from '../services/leadService.js';
import prisma from '../config/db.js';

export const assignLeadController = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { assigneeIds } = req.body;
    const assignedById = req.user.id;

    // If requester is admin and there is already an active assignment by super admin, block unless permission granted
    if (req.user.role === 'admin') {
      const active = await prisma.leadAssignment.findFirst({
        where: { leadId: Number(leadId), active: true },
        include: { assignedByUser: { select: { role: true } } },
      });
      const permitted = await prisma.reassignPermission.findFirst({
        where: { leadId: Number(leadId), adminId: assignedById, used: false },
      });
      if (active && active.assignedByUser?.role === 'super admin' && !permitted) {
        return res.status(403).json({ message: 'Lead already assigned by super admin. Request reassignment.' });
      }
    }

    const result = await assignLead(Number(leadId), assigneeIds.map(Number), assignedById);
    // If admin had a one-time permission, mark as used
    if (req.user.role === 'admin') {
      await prisma.reassignPermission.updateMany({
        where: { leadId: Number(leadId), adminId: assignedById, used: false },
        data: { used: true },
      });
    }
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to assign lead" });
  }
};

export const bulkAssignController = async (req, res) => {
  try {
    const { leadIds, assigneeIds } = req.body;
    const assignedById = req.user.id;

    const result = await bulkAssignLeads(leadIds.map(Number), assigneeIds.map(Number), assignedById);
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed bulk assignment" });
  }
};

export const requestReassignController = async (req, res) => {
  try {
    const { leadId } = req.params;
    const requestedById = req.user.id;

    const result = await requestReassignment(Number(leadId), requestedById);
    res.json({ success: true, message: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to request reassignment" });
  }
};
