import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan'; 
dotenv.config();

import authRoutes from "./routes/authRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

// Enable CORS
app.use(
  cors({
    origin: ["https://lmtproject.vercel.app", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json());

// Log incoming requests
app.use(morgan('dev')); 

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/users", userRoutes);

app.use('/', (req, res) => {
  res.send('LMT Backend is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
