import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createAdapter } from '@socket.io/redis-adapter';
import connectDB from './config/db.js';
import quizRoutes from './routes/quizRoutes.js';
import { registerSocketHandlers } from './socket/socketHandlers.js';
import { pubClient, subClient } from './config/redis.js';
import logger, { requestLogger } from './config/logger.js';

dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Rate limiting middleware for general routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again in 15 minutes.' }
});

// Express Middleware
app.use(cors({
  origin: '*', // Allow all origins for local development simplicity
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(requestLogger);

// Mount API Rate limiter
app.use('/api', generalLimiter);

// API Routes
app.use('/api/quizzes', quizRoutes);
app.use('/api/quiz', quizRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// General Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled request error occurred', { error: err.message, stack: err.stack });
  res.status(500).json({ message: 'Internal Server Error: Something went wrong.' });
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

// Attach Redis adapter for horizontal scaling (bypassed in test suite)
if (process.env.NODE_ENV !== 'test') {
  io.adapter(createAdapter(pubClient, subClient));
  logger.info('Socket.io Redis adapter connected successfully.');
}

// Hook Socket Handlers
registerSocketHandlers(io);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

export { app, server, io }; // Export for Jest/Supertest testing
