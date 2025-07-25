const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./config/db");

const authRoutes = require("./routes/authRoutes");
const leadRoutes = require("./routes/leadRoutes");
const userRoutes = require("./routes/user");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Use only one base path for user routes
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/leads", leadRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
