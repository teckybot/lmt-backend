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
    description,
    state,
    district,
    location,
    assignedTo, // New field for user assignments
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

    // Validate assignedTo
    const assignments = Array.isArray(assignedTo) ? assignedTo : [assignedTo].filter(Boolean);

    // Use a Prisma transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Create lead
      const newLead = await tx.lead.create({
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

      // Create LeadAssignment entries if assignedTo is provided
      if (assignments.length > 0) {
        const assignmentData = assignments.map((assignedUserId) => ({
          leadId: newLead.id,
          userId: Number(assignedUserId),
          assignedBy: userId,
          active: true,
        }));
        await tx.leadAssignment.createMany({
          data: assignmentData,
        });
      }

      // Construct a meaningful identifier for logging
      const leadIdentifier = `${source} - ${customerName}`;
      
      // Log activity
      await logActivity(tx,{
        userId,
        leadId: newLead.id,
        leadIdentifier,
        action: 'CREATED',
        details: `Created lead for ${customerName} (Source: ${source})${assignments.length > 0 ? ` and assigned to ${assignments.length} user(s).` : ''}`,
        skipLogging: req.skipLogging,
      });

      return newLead;
    });

    res.status(201).json({ message: 'Lead created successfully', lead: result });
  } catch (err) {
    console.error('Create Lead Error:', err);
    res.status(500).json({ error: 'Failed to create lead.' });
  }
};

// GET ALL LEADS
export const getLeads = async (req, res) => {
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
                avatar: true,
              },
            },
            assignedByUser: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const formattedLeads = leads.map(lead => {
      const assignees = lead.assignments.map(a => ({
        ...a.user,
        avatar: a.user?.avatar ? `${baseUrl}${a.user.avatar}` : null,
      }));
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
              select: { id: true, name: true, avatar: true },
            },
            assignedByUser: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    });

    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const formattedLeads = leads.map((lead) => {
      const assignees = lead.assignments.map((assignment) => ({
        ...assignment.user,
        avatar: assignment.user?.avatar ? `${baseUrl}${assignment.user.avatar}` : null,
      }));
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
        const leadId = Number(id);

        const result = await prisma.$transaction(async (tx) => {
            const oldLead = await tx.lead.findUnique({
                where: { id: leadId },
                select: { id: true, customerName: true, source: true, status: true },
            });
            if (!oldLead) {
                // Return early from the transaction block
                return null;
            }

            const data = { status };
            if (status === 'Closed') {
                data.closedBy = userId;
                data.closedAt = new Date();
            } else {
                data.closedBy = null;
                data.closedAt = null;
            }

            const updatedLead = await tx.lead.update({
                where: { id: leadId },
                data,
            });

            const leadIdentifier = `${updatedLead.source} - ${updatedLead.customerName}`;
            
            // Pass the transaction client (tx)
            await logActivity(tx, {
                userId,
                leadId: updatedLead.id,
                leadIdentifier,
                action: status === 'Closed' ? 'CLOSED' : 'UPDATED',
                details: `Updated status for ${leadIdentifier}: ${oldLead.status} → ${updatedLead.status}`,
                skipLogging: req.skipLogging,
            });
            
            return updatedLead;
        });

        if (!result) return res.status(404).json({ error: 'Lead not found' });

        res.json({ message: 'Lead status updated', lead: result });
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
        customerName, phone, email, source, dueDate, priority, status, description, state, district, location,
    } = req.body;

    try {
        const userId = req.user.id;

        const result = await prisma.$transaction(async (tx) => {
            const oldLead = await tx.lead.findUnique({
                where: { id: leadId },
                select: { customerName: true, phone: true, email: true, source: true, dueDate: true, priority: true, status: true, description: true, state: true, district: true, location: true },
            });

            if (!oldLead) return null;

            const data = {
                updatedAt: new Date(),
            };
            const changes = [];

            // Helper function to handle and log changes
            const updateField = (key, value) => {
                if (value !== undefined && oldLead[key] !== value) {
                    data[key] = value;
                    changes.push(`${key}: ${oldLead[key] ?? 'null'} → ${value ?? 'null'}`);
                }
            };
            
            if (customerName !== undefined) data.customerName = customerName;
            if (phone !== undefined) data.phone = phone;
            if (email !== undefined) data.email = email;
            if (source !== undefined) data.source = source;
            if (dueDate !== undefined) {
                const dueDateObj = new Date(dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (dueDateObj < today) {
                    throw new Error('Due Date cannot be in the past.');
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
            
            const updatedLead = await tx.lead.update({
                where: { id: leadId },
                data,
            });

            const leadIdentifier = `${updatedLead.source} - ${updatedLead.customerName}`;

            const details = changes.length
                ? `Updated lead "${leadIdentifier}": ${changes.join(', ')}`
                : `Updated lead "${leadIdentifier}"`;

            // Pass the transaction client (tx)
            await logActivity(tx, {
                userId,
                leadId: updatedLead.id,
                leadIdentifier,
                action: status === 'Closed' ? 'CLOSED' : 'UPDATED',
                details,
                skipLogging: req.skipLogging,
            });

            return updatedLead;
        });

        if (!result) return res.status(404).json({ message: 'Lead not found' });

        res.status(200).json({ message: 'Lead updated', lead: result });
    } catch (err) {
        if (err.message === 'Due Date cannot be in the past.') {
            return res.status(400).json({ error: err.message });
        }
        console.error('Update Lead Error:', err);
        res.status(500).json({ message: 'Failed to update lead.' });
    }
};

// DELETE LEAD
export const deleteLead = async (req, res) => {
    const leadId = Number(req.params.id);

    try {
        const result = await prisma.$transaction(async (tx) => {
            const lead = await tx.lead.findUnique({
                where: { id: leadId },
                select: { id: true, customerName: true, source: true },
            });
            if (!lead) return null;

            const leadIdentifier = `${lead.source} - ${lead.customerName}`;
            const userId = req.user.id;

            // Log activity before deletion
            await logActivity(tx, { // Pass the transaction client (tx)
                userId,
                leadId: lead.id,
                leadIdentifier,
                action: 'DELETED',
                details: `Deleted lead ${leadIdentifier} (ID: ${lead.id})`,
                skipLogging: req.skipLogging,
            });

            // Perform the deletion
            await tx.lead.delete({ where: { id: leadId } });

            return lead;
        });

        if (!result) return res.status(404).json({ message: 'Lead not found' });

        res.status(200).json({ message: 'Lead deleted successfully.' });
    } catch (err) {
        if (err.code === 'P2025') return res.status(404).json({ message: 'Lead not found' });
        console.error('Delete Lead Error:', err);
        res.status(500).json({ message: 'Failed to delete lead.' });
    }
};

