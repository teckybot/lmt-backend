const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  getActivity,
} = require('../controllers/userController');

router.get('/profile', authenticateToken, getProfile);
router.put('/profile', authenticateToken, updateProfile);
router.get('/activity', authenticateToken, getActivity);

module.exports = router;
