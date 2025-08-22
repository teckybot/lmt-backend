import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan'; 
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

import authRoutes from "./routes/authRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import assignRoutes from "./routes/assignRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS
app.use(
  cors({
    origin: ["https://lmt-frontend.vercel.app", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json());

// Log incoming requests
app.use(morgan('dev')); 

//uploads
app.use('/avatars', express.static(path.join(__dirname, 'uploads/avatars')));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/assigns", assignRoutes);

app.use('/', (req, res) => {
  res.send('LMT Backend is running');
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
