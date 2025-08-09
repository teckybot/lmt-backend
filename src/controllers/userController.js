const pool = require("../config/db");

// Define getUsers function
const getUsers = async (req, res) => {
  try {
    const result = await pool.query("SELECT id, name, role FROM users");
    res.json(result.rows);
  } catch (err) {
    console.error("Get users error:", err.message);
    res.status(500).json({ message: "Error fetching users" });
  }
};

// Define other functions
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query("SELECT id, name, email, role FROM users WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get profile error:", err.message);
    res.status(500).json({ message: "Error fetching profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;
    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
      [name, email, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "Profile updated", user: result.rows[0] });
  } catch (err) {
    console.error("Update profile error:", err.message);
    res.status(500).json({ message: "Error updating profile" });
  }
};

const getActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      "SELECT * FROM user_activity WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get activity error:", err.message);
    res.status(500).json({ message: "Error fetching activity" });
  }
};

// Export all functions
module.exports = { getUsers, getProfile, updateProfile, getActivity };