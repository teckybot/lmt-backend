import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan'; 
import path from "path";
import { fileURLToPath } from 'url';
import http from "http";
import { Server } from "socket.io";

dotenv.config();

import authRoutes from "./routes/authRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import assignRoutes from "./routes/assignRoutes.js"; 
import notificationRoutes from './routes/notificationRoutes.js';
import commentRoutes from './routes/commentRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS
app.use(
  cors({
    origin: ["https://lmt-frontend.vercel.app", "http://localhost:5173","https://leadzo.teckybot.com"],
    credentials: true,
  })
);

// Body parser
app.use(express.json());

// Log requests
app.use(morgan('dev')); 

// Serve static uploads
app.use('/avatars', express.static(path.join(__dirname, 'uploads/avatars')));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/users", userRoutes);
app.use("/api/assigns", assignRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/comments", commentRoutes);

// Health check
app.use('/health', (req, res) => {
  res.send('LMT Backend is running');
});

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
const io = new Server(server, {
  cors: {
    origin: ["https://lmt-frontend.vercel.app", "http://localhost:5173","https://leadzo.teckybot.com"],
    credentials: true,
  },
});

// Make io accessible in controllers via req.app.get("io")
app.set("io", io);

// Socket.IO connection events
io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  socket.on("joinLeadRoom", (leadId) => {
    socket.join(`lead_${leadId}`);
    console.log(`Socket ${socket.id} joined room lead_${leadId}`);
  });

  socket.on("leaveLeadRoom", (leadId) => {
    socket.leave(`lead_${leadId}`);
    console.log(`Socket ${socket.id} left room lead_${leadId}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5002;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
