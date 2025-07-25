const pool = require('../config/db');

// GET user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Fetching profile for user ID: ${userId}`);

    // Fetch user info
    const userRes = await pool.query(
      'SELECT id, name, email, phone, avatar, created_at, last_login FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      console.log(`User not found for ID: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userRes.rows[0];
    console.log(`User data: ${JSON.stringify(user)}`);

    // Total leads created
    const addedRes = await pool.query(
      'SELECT COUNT(*) FROM leads WHERE created_by = $1',
      [userId]
    );
    console.log(`Leads added for user ${userId}: ${addedRes.rows[0].count}`);

    // Total converted leads
    const convertedRes = await pool.query(
      "SELECT COUNT(*) FROM leads WHERE created_by = $1 AND LOWER(status) = 'closed'",
      [userId]
    );
    console.log(`Leads converted for user ${userId}: ${convertedRes.rows[0].count}`);

    // Attach analytics to user object
    user.leadsAdded = parseInt(addedRes.rows[0].count);
    user.leadsConverted = parseInt(convertedRes.rows[0].count);

    res.json(user);
  } catch (err) {
    console.error('Get profile error:', err.message, err.stack);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

// UPDATE profile
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email, phone, avatar } = req.body;

  try {
    await pool.query(
      'UPDATE users SET name = $1, email = $2, phone = $3, avatar = $4 WHERE id = $5',
      [name, email, phone, avatar, userId]
    );
    console.log(`Profile updated for user ${userId}`);
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update profile error:', err.message, err.stack);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// GET recent user activity
exports.getActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`Fetching activity for user ID: ${userId}`);

    const result = await pool.query(
      'SELECT action, details, timestamp FROM user_activity WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10',
      [userId]
    );
    console.log(`Activity for user ${userId}: ${JSON.stringify(result.rows)}`);

    res.json(result.rows);
  } catch (err) {
    console.error('Activity fetch error:', err.message, err.stack);
    res.status(500).json({ message: 'Error fetching activity' });
  }
};