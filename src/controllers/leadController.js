import prisma from '../config/db.js';
import { logActivity } from '../utils/activityLogger.js';

// CREATE LEAD
export const createLead = async (req, res) => {
  const {
    customerName,
    phone,
    email,
    source,
    dueDate,
    priority,
    description, // FAQ JSON
    state,
    district,
    location,
  } = req.body;

  const userId = req.user.id;

  try {
    // Validate required fields
    if (!customerName || !phone || !source) {
      return res.status(400).json({ error: 'Customer Name, Phone, and Source are required.' });
    }

    // Validate dueDate (must be >= today)
    let dueDateObj = null;
    if (dueDate) {
      dueDateObj = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // ignore time part
      if (dueDateObj < today) {
        return res.status(400).json({ error: 'Due Date cannot be in the past.' });
      }
    }

    // Create lead
    const newLead = await prisma.lead.create({
      data: {
        customerName,
        phone,
        email,
        source,
        dueDate: dueDateObj,
        priority: priority || 'Medium',
        description: description || null,
        state: state || null,
        district: district || null,
        location: location || null,
        status: 'New',
        createdBy: userId,
      },
    });

    // Construct a meaningful identifier for logging
    const leadIdentifier = `${source} - ${customerName}`;

    // Log activity
    await logActivity({
      userId,
      leadId: newLead.id,
      leadIdentifier,
      action: 'CREATED',
      details: `Created lead for ${customerName} (Source: ${source})`,
      skipLogging: req.skipLogging,
    });

    res.status(201).json({ message: 'Lead created successfully', lead: newLead });
  } catch (err) {
    console.error('Create Lead Error:', err);
    res.status(500).json({ error: 'Failed to create lead.' });
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
            assignedByUser: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    // The frontend LeadTable.jsx expects an `assignees` property directly on each lead object.
    // This maps the database result into that format.
    const formattedLeads = leads.map(lead => {
      const assignees = lead.assignments.map(a => a.user);
      const assignedByNames = Array.from(new Set(lead.assignments.map(a => a.assignedByUser?.name).filter(Boolean)));
      return {
        ...lead,
        assignees,
        assignedByNames,
      };
    });

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
            assignedByUser: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    const formattedLeads = leads.map((lead) => {
      const assignees = lead.assignments.map((assignment) => assignment.user);
      const assignedByNames = Array.from(new Set(lead.assignments.map(a => a.assignedByUser?.name).filter(Boolean)));
      return {
        ...lead,
        assignees,
        assignedByNames,
      };
    });

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
      select: { id: true, customerName: true, source: true, status: true },
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

    const updatedLead = await prisma.lead.update({
      where: { id: Number(id) },
      data,
    });

    // Construct lead identifier
    const leadIdentifier = `${updatedLead.source} - ${updatedLead.customerName}`;

    // Log activity
    await logActivity({
      userId,
      leadId: updatedLead.id,
      leadIdentifier,
      action: status === 'Closed' ? 'CLOSED' : 'UPDATED',
      details: `Updated status for ${leadIdentifier}: ${oldLead.status} → ${updatedLead.status}`,
      skipLogging: req.skipLogging,
    });

    res.json({ message: 'Lead status updated', lead: updatedLead });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Lead not found' });
    console.error('Update Status Error:', err);
    res.status(500).json({ error: 'Error updating status' });
  }
};


// UPDATE LEAD DETAILS
export const updateLead = async (req, res) => {
  const leadId = Number(req.params.id);
  const {
    customerName,
    phone,
    email,
    source,
    dueDate,
    priority,
    status,
    description,
    state,
    district,
    location,
  } = req.body;

  try {
    const userId = req.user.id;

    // Fetch the existing lead
    const oldLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        customerName: true,
        phone: true,
        email: true,
        source: true,
        dueDate: true,
        priority: true,
        status: true,
        description: true,
        state: true,
        district: true,
        location: true,
      },
    });

    if (!oldLead) return res.status(404).json({ message: 'Lead not found' });

    const data = {};

    if (customerName !== undefined) data.customerName = customerName;
    if (phone !== undefined) data.phone = phone;
    if (email !== undefined) data.email = email;
    if (source !== undefined) data.source = source;
    if (dueDate !== undefined) {
      const dueDateObj = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDateObj < today) {
        return res.status(400).json({ error: 'Due Date cannot be in the past.' });
      }
      data.dueDate = dueDateObj;
    }
    if (priority !== undefined) data.priority = priority;
    if (status !== undefined) {
      data.status = status;
      if (status === 'Closed') {
        data.closedBy = userId;
        data.closedAt = new Date();
      } else {
        data.closedBy = null;
        data.closedAt = null;
      }
    }
    if (description !== undefined) data.description = description;
    if (state !== undefined) data.state = state;
    if (district !== undefined) data.district = district;
    if (location !== undefined) data.location = location;

    data.updatedAt = new Date();

    // Update lead in DB
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data,
    });

    // Construct lead identifier for logging
    const leadIdentifier = `${updatedLead.source} - ${updatedLead.customerName}`;

    // Prepare change log
    const changes = [];
    for (const key of Object.keys(data)) {
      if (['updatedAt', 'closedAt', 'closedBy'].includes(key)) continue;

      let oldVal = oldLead[key];
      let newVal = data[key];

      if (key === 'description') {
        oldVal = JSON.stringify(oldVal || {});
        newVal = JSON.stringify(newVal || {});
      } else if (oldVal instanceof Date) {
        oldVal = oldVal.toLocaleDateString();
        newVal = newVal instanceof Date ? newVal.toLocaleDateString() : newVal;
      }

      if (oldVal !== newVal) {
        changes.push(`${key}: ${oldVal ?? 'null'} → ${newVal ?? 'null'}`);
      }
    }

    const details = changes.length
      ? `Updated lead "${leadIdentifier}": ${changes.join(', ')}`
      : `Updated lead "${leadIdentifier}"`;

    // Log activity
    await logActivity({
      userId,
      leadId: updatedLead.id,
      leadIdentifier,
      action: status === 'Closed' ? 'CLOSED' : 'UPDATED',
      details,
      skipLogging: req.skipLogging,
    });

    res.status(200).json({ message: 'Lead updated', lead: updatedLead });
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
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, customerName: true, source: true },
    });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Construct lead identifier
    const leadIdentifier = `${lead.source} - ${lead.customerName}`;

    // Log activity before deletion
    await logActivity({
      userId: req.user.id,
      leadId: lead.id,
      leadIdentifier,
      action: 'DELETED',
      details: `Deleted lead ${leadIdentifier} (ID: ${lead.id})`,
      skipLogging: req.skipLogging,
    });

    await prisma.lead.delete({ where: { id: leadId } });

    res.status(200).json({ message: 'Lead deleted successfully.' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Lead not found' });
    console.error('Delete Lead Error:', err);
    res.status(500).json({ message: 'Failed to delete lead.' });
  }
};

