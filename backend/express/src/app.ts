import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

// Import route definitions
import documentsRouter from './routes/documents';
import examsRouter from './routes/exams';
import analyticsRouter from './routes/analytics';
import chatRouter from './routes/chat';

// Import socket handler
import { setupChatSockets } from './socket/chat';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io server with permissive CORS for local client testing
const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
  }
});

// Setup Express Middlewares
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Express API Gateway' });
});

// Bind API Gateways
app.use('/api/documents', documentsRouter);
app.use('/api/exams', examsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/chat', chatRouter);

// Bind WebSocket Logic
setupChatSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`[ExamGenie Gateway] Server running in development mode on port ${PORT}`);
});
