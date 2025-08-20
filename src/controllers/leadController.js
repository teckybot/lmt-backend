import prisma from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

// CREATE LEAD
export const createLead = async (req, res) => {
  const { title, customerName, phone, email, source, dueDate, priority, notes } = req.body;
  const userId = req.user.id;

  try {
    const newLead = await prisma.lead.create({
      data: {
        title,
        customerName,
        phone,
        email,
        source,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        notes,
        status: 'New',
        createdBy: userId,
      },
    });

    await logActivity({
      userId,
      leadId: newLead.id,
      leadTitle: newLead.title,
      action: 'CREATED',
      details: `Created lead "${newLead.title}"`,
      skipLogging: req.skipLogging
    });

    res.status(201).json({ message: 'Lead created successfully' });
  } catch (err) {
    console.error('Create Lead Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET ALL LEADS
export const getLeads = async (_req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      // Include the assigned users for each lead.
      include: {
        assignments: {
          where: {
            active: true, // Only fetch current assignments
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // The frontend LeadTable.jsx expects an `assignees` property directly on each lead object.
    // This maps the database result into that format.
    const formattedLeads = leads.map(lead => ({
      ...lead,
      assignees: lead.assignments.map(assignment => assignment.user),
    }));

    res.json(formattedLeads);
  } catch (err) {
    console.error('Get Leads Error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

// GET LEADS ASSIGNED TO CURRENT USER
export const getMyLeads = async (req, res) => {
  try {
    const userId = req.user.id;

    const leads = await prisma.lead.findMany({
      where: {
        assignments: {
          some: {
            active: true,
            userId: userId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          where: { active: true },
          select: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    const formattedLeads = leads.map((lead) => ({
      ...lead,
      assignees: lead.assignments.map((assignment) => assignment.user),
    }));

    res.json(formattedLeads);
  } catch (err) {
    console.error('Get My Leads Error:', err);
    res.status(500).json({ error: 'Failed to fetch assigned leads' });
  }
};

// UPDATE LEAD STATUS
export const updateLeadStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  try {
    const userId = req.user.id;

    const oldLead = await prisma.lead.findUnique({
      where: { id: Number(id) },
      select: { id: true, title: true, status: true },
    });
    if (!oldLead) return res.status(404).json({ error: 'Lead not found' });

    const data = { status };
    if (status === 'Closed') {
      data.closedBy = userId;
      data.closedAt = new Date();
    } else {
      data.closedBy = null;
      data.closedAt = null;
    }

    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data,
    });

    await logActivity({
      userId,
      leadId: lead.id,
      leadTitle: lead.title,
      action: status === 'Closed' ? 'CLOSED' : 'UPDATED',
      details: `Updated status: ${oldLead.status} → ${lead.status}`,
      skipLogging: req.skipLogging
    });

    res.json({ message: 'Lead status updated', lead });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lead not found' });
    console.error('Update Status Error:', err);
    res.status(500).json({ error: 'Error updating status' });
  }
};

// UPDATE LEAD DETAILS
export const updateLead = async (req, res) => {
  const leadId = Number(req.params.id);
  const { title, customerName, email, phone, source, dueDate, priority, status, notes } = req.body;

  try {
    const userId = req.user.id;

    const oldLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { title: true, customerName: true, email: true, phone: true, source: true, dueDate: true, priority: true, status: true, notes: true },
    });
    if (!oldLead) return res.status(404).json({ message: 'Lead not found' });

    const data = {};
    if (title !== undefined) data.title = title;
    if (customerName !== undefined) data.customerName = customerName;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (source !== undefined) data.source = source;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (priority !== undefined) data.priority = priority;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;

    if (status === 'Closed') {
      data.closedBy = userId;
      data.closedAt = new Date();
    } else if (status) {
      data.closedBy = null;
      data.closedAt = null;
    }

    data.updatedAt = new Date();

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data,
    });

    const changes = [];
    for (const key of Object.keys(data)) {
      if (['updatedAt', 'closedAt', 'closedBy'].includes(key)) continue;

      const oldVal = oldLead[key] instanceof Date ? oldLead[key]?.toLocaleDateString() : oldLead[key];
      const newVal = data[key] instanceof Date ? data[key]?.toLocaleDateString() : data[key];

      if (oldVal !== newVal) changes.push(`${key}: ${oldVal ?? 'null'} → ${newVal ?? 'null'}`);
    }

    const details = changes.length ? `Updated lead "${lead.title}": ${changes.join(', ')}` : `Updated lead "${lead.title}"`;

    await logActivity({
      userId,
      leadId: lead.id,
      leadTitle: lead.title,
      action: status === 'Closed' ? 'CLOSED' : 'UPDATED',
      details,
      skipLogging: req.skipLogging
    });

    res.status(200).json({ message: 'Lead updated', lead });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Lead not found' });
    console.error('Update Lead Error:', err);
    res.status(500).json({ message: 'Failed to update lead.' });
  }
};

// DELETE LEAD
export const deleteLead = async (req, res) => {
  const leadId = Number(req.params.id);

  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    await logActivity({
      userId: req.user.id,
      leadId: lead.id,
      leadTitle: lead.title,
      action: 'DELETED',
      details: `Deleted lead "${lead.title}" (ID: ${lead.id})`,
      skipLogging: req.skipLogging
    });

    await prisma.lead.delete({ where: { id: leadId } });

    res.status(200).json({ message: 'Lead deleted successfully.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Lead not found' });
    console.error('Delete Lead Error:', err);
    res.status(500).json({ message: 'Failed to delete lead.' });
  }
};
