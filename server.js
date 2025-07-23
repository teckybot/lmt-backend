const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Connect to PostgreSQL
require("./config/db");

const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");
const userRoutes = require("./routes/user"); // ✅ Moved this up

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/user", userRoutes); // ✅ Moved this before listen()

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
