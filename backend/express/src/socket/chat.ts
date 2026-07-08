import { Server, Socket } from 'socket.io';
import axios from 'axios';
import { supabase } from '../config/supabase';

export function setupChatSockets(io: Server) {
  // Middleware to authenticate socket connections with Supabase JWT
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token is required.'));
      }

      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return next(new Error('Authentication error: Invalid session token.'));
      }

      // Attach user information to socket data
      socket.data.userId = user.id;
      next();
    } catch (err) {
      return next(new Error('Socket authentication error.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User connected to WebSocket chat: ${userId} (Socket ID: ${socket.id})`);

    // 1. Join Chat Session Room
    socket.on('joinSession', async ({ sessionId }) => {
      if (!sessionId) return;
      
      try {
        // Verify chat session belongs to the connected user
        const { data: session, error } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('id', sessionId)
          .eq('user_id', userId)
          .single();

        if (error || !session) {
          socket.emit('error', 'Session not found or access denied.');
          return;
        }

        socket.join(sessionId);
        console.log(`Socket ${socket.id} joined room session: ${sessionId}`);
      } catch (err) {
        socket.emit('error', 'Error joining chat session room.');
      }
    });

    // 2. Receive Student Message
    socket.on('sendMessage', async ({ sessionId, documentId, text }) => {
      if (!sessionId || !text || !documentId) {
        socket.emit('error', 'sessionId, documentId, and text are required fields.');
        return;
      }

      try {
        // A. Save student message in Supabase
        const { data: studentMsg, error: saveStudentErr } = await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            sender: 'student',
            content: text
          })
          .select()
          .single();

        if (saveStudentErr || !studentMsg) {
          throw new Error('Failed to log student message to database.');
        }

        // Echo back student message to confirm save
        io.to(sessionId).emit('messageSaved', studentMsg);

        // B. Emit typing state to room
        socket.to(sessionId).emit('aiTyping', { sessionId, isTyping: true });

        // C. Fetch context and answer from FastAPI RAG Service
        const fastapiUrl = process.env.PYTHON_SERVICE_URL || 'http://127.0.0.1:8000';
        const response = await axios.post(`${fastapiUrl}/query`, {
          document_id: documentId,
          query: text
        });

        const { answer, citations } = response.data;

        // D. Save AI's citation-backed response to Supabase
        const { data: aiMsg, error: saveAiErr } = await supabase
          .from('chat_messages')
          .insert({
            session_id: sessionId,
            sender: 'ai',
            content: answer,
            citations: citations || []
          })
          .select()
          .single();

        if (saveAiErr || !aiMsg) {
          throw new Error('Failed to log AI response to database.');
        }

        // E. Stop typing state and emit AI response to the session
        io.to(sessionId).emit('aiTyping', { sessionId, isTyping: false });
        io.to(sessionId).emit('messageSaved', aiMsg);

      } catch (err: any) {
        console.error('Socket chat error:', err.message);
        socket.to(sessionId).emit('aiTyping', { sessionId, isTyping: false });
        socket.emit('error', 'The AI Tutor experienced an issue generating a response.');
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
