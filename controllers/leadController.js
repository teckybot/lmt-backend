const pool = require("../config/db");

// Create a new lead
exports.createLead = async (req, res) => {
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
        'New' // default status
      ]
    );

    res.status(201).json({ message: "Lead created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all leads
exports.getLeads = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM leads ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update status of a lead
exports.updateLeadStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

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
    res.status(500).json({ error: err.message });
  }
};
