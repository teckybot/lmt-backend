const pool = require('../config/db');

// GET profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRes = await pool.query(
      'SELECT id, name, email, phone, avatar, created_at, last_login FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    const user = userRes.rows[0];

    const addedRes = await pool.query(
      'SELECT COUNT(*) FROM leads WHERE created_by = $1',
      [userId]
    );
    const convertedRes = await pool.query(
      "SELECT COUNT(*) FROM leads WHERE created_by = $1 AND status = 'closed'",
      [userId]
    );

    user.leadsAdded = parseInt(addedRes.rows[0].count);
    user.leadsConverted = parseInt(convertedRes.rows[0].count);

    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// UPDATE profile
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email, phone, avatar } = req.body;

  try {
    await pool.query(
      "UPDATE users SET name = $1, email = $2, phone = $3, avatar = $4 WHERE id = $5",
      [name, email, phone, avatar, userId]
    );

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Update Error:", err.message);
    res.status(500).json({ message: "Error updating profile" });
  }
};

// GET activity
exports.getActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT action, details, timestamp FROM user_activity WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Activity fetch error:', err);
    res.status(500).json({ message: 'Error fetching activity' });
  }
};
