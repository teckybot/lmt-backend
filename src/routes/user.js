const express = require("express");
const router = express.Router();
const { getUsers, getProfile, updateProfile, getActivity } = require("../controllers/userController");
const authenticateToken = require("../middleware/authMiddleware");

router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.get("/activity", authenticateToken, getActivity);
router.get("/", authenticateToken, getUsers); // Line 6, now with valid getUsers

module.exports = router;