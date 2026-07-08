import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import quizRoutes from './routes/quizRoutes.js';
import { registerSocketHandlers } from './socket/socketHandlers.js';

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Express Middleware
app.use(cors({
  origin: '*', // Allow all origins for local development simplicity
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/quizzes', quizRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.io Server
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000, // 60s
  pingInterval: 25000 // 25s
});

// Hook Socket Handlers
registerSocketHandlers(io);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
