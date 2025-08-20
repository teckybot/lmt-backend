import { assignLead, bulkAssignLeads, requestReassignment } from '../services/leadService.js';

export const assignLeadController = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { assigneeIds } = req.body;
    const assignedById = req.user.id;

    const result = await assignLead(Number(leadId), assigneeIds.map(Number), assignedById);
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
    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to request reassignment" });
  }
};
