import prisma from '../config/db.js';

export const createLead = async (req, res) => {
  const {
    title, customer_name, phone, email, source,
    due_date, priority, notes
  } = req.body;

  const userId = req.user.id;

  try {
    await prisma.lead.create({
      data: {
        title,
        customerName: customer_name,
        phone,
        email,
        source,
        dueDate: due_date ? new Date(due_date) : null,
        priority,
        notes,
        status: 'New',
        createdBy: userId,
      },
    });
    res.status(201).json({ message: "Lead created successfully" });
  } catch (err) {
    console.error("Create Lead Error:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getLeads = async (_req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateLeadStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: "Status is required" });

  try {
    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data: { status },
    });
    res.json({ message: "Lead status updated", lead });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: "Lead not found" });
    console.error("Update Status Error:", err);
    res.status(500).json({ error: "Error updating status" });
  }
};

export const updateLead = async (req, res) => {
  const leadId = Number(req.params.id);
  const {
    title, customer_name, email, phone, source,
    due_date, priority, status, notes
  } = req.body;

  try {
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        title,
        customerName: customer_name,
        email,
        phone,
        source,
        dueDate: due_date ? new Date(due_date) : null,
        priority,
        status,
        notes,
        updatedAt: new Date(),
      },
    });
    res.status(200).json({ message: "Lead updated", lead });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: "Lead not found" });
    console.error("Update Lead Error:", err);
    res.status(500).json({ message: "Failed to update lead." });
  }
};

export const deleteLead = async (req, res) => {
  const leadId = Number(req.params.id);
  try {
    await prisma.lead.delete({ where: { id: leadId } });
    res.status(200).json({ message: "Lead deleted successfully." });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: "Lead not found" });
    console.error("Delete Lead Error:", err);
    res.status(500).json({ message: "Failed to delete lead." });
  }
};
