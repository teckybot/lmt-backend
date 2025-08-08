const pool = require("../config/db");

// Create a new lead
const createLead = async (req, res) => {
  const {
    title,
    customer_name,
    phone,
    email,
    source,
    due_date,
    priority,
    notes
  } = req.body;

  const userId = req.user.id;

  try {
    await pool.query(
      `INSERT INTO leads 
        (title, customer_name, phone, email, source, due_date, priority, notes, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        title,
        customer_name,
        phone,
        email,
        source,
        due_date,
        priority,
        notes,
        userId,
        'New'
      ]
    );

    res.status(201).json({ message: "Lead created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all leads
const getLeads = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM leads ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update status
const updateLeadStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: "Status is required" });

  try {
    const result = await pool.query(
      "UPDATE leads SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json({ message: "Lead status updated", lead: result.rows[0] });
  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ error: "Error updating status" });
  }
};


// Update lead (Edit)
const updateLead = async (req, res) => {
  const leadId = req.params.id;
  const {
    title,
    customer_name,
    email,
    phone,
    source,
    due_date,
    priority,
    status,
    notes
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE leads SET 
        title = $1,
        customer_name = $2,
        email = $3,
        phone = $4,
        source = $5,
        due_date = $6,
        priority = $7,
        status = $8,
        notes = $9
       WHERE id = $10 RETURNING *`,
      [title, customer_name, email, phone, source, due_date, priority, status, notes, leadId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({ message: "Lead updated", lead: result.rows[0] });
  } catch (err) {
    console.error("Update Lead Error:", err);
    res.status(500).json({ message: "Failed to update lead." });
  }
};

// Delete lead
const deleteLead = async (req, res) => {
  const leadId = req.params.id;

  try {
    const result = await pool.query("DELETE FROM leads WHERE id = $1 RETURNING *", [leadId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({ message: "Lead deleted successfully." });
  } catch (err) {
    console.error("Delete Lead Error:", err);
    res.status(500).json({ message: "Failed to delete lead." });
  }
};

module.exports = {
  createLead,
  getLeads,
  updateLeadStatus,
  updateLead,
  deleteLead
};