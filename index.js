import connectDB from './src/db/index.js';
import dotenv from 'dotenv';
import { app } from './src/app.js';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './src/model/user.model.js';
import { setIO, getUserRoom } from './src/utils/socket.js';

dotenv.config({
  path: '.env'
});

const port = process.env.PORT || 4000;

const server = http.createServer(app);

// FIXED: Socket.IO CORS — must match FRONTEND 5173
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

setIO(io);

// ---------------------------
// JWT AUTH MIDDLEWARE
// ---------------------------
io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token || socket.handshake.query?.token;

    // Fallback to cookie token
    if (!token) {
      const cookieHeader = socket.handshake.headers?.cookie;
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, ...val] = cookie.trim().split('=');
          acc[key] = decodeURIComponent(val.join('='));
          return acc;
        }, {});
        token = cookies.accessToken;
      }
    }

    if (!token) return next(new Error('Unauthorized'));

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded?._id).select('_id username role');

    if (!user) return next(new Error('Unauthorized'));

    socket.user = { id: String(user._id), username: user.username, role: user.role };

    // AUTO JOIN USER PRIVATE ROOM
    const userRoom = getUserRoom(socket.user.id);
    if (userRoom) socket.join(userRoom);

    next();
  } catch (e) {
    if (e?.name === 'TokenExpiredError') return next(new Error('Session expired'));
    next(new Error('Unauthorized'));
  }
});

// ---------------------------
// SOCKET CONNECTION
// ---------------------------
io.on('connection', (socket) => {
  console.log("Socket connected:", socket.id);

  const safeSocket = (handler) => (payload) => {
    Promise.resolve(handler(payload)).catch((err) => {
      console.error('Socket error:', err);
    });
  };

  // --------------------------------------
  // MESSAGE SEND
  // --------------------------------------
  socket.on('message:send', safeSocket(async ({ threadId, text, attachments }) => {
    if (!threadId) return;

    const { sendMessage } = await import('./src/services/messageService.js');
    const result = await sendMessage(threadId, socket.user.id, text, attachments || []);

    const { Message } = await import('./src/model/message.model.js');
    
    // Handle Gemini response (result can be a single message or an object with userMessage and geminiMessage)
    // Check if result has both userMessage and geminiMessage (Gemini response)
    if (result && typeof result === 'object' && result.userMessage && result.geminiMessage) {
      // Gemini thread - emit both messages
      const populatedUserMsg = await Message.findById(result.userMessage._id)
        .populate('sender', 'username avatarUrl')
        .lean();

      const populatedGeminiMsg = await Message.findById(result.geminiMessage._id)
        .populate('sender', 'username avatarUrl')
        .lean();

      // Emit user message first
      io.to(String(threadId)).emit('message:new', { threadId, message: populatedUserMsg });
      
      // Small delay before emitting Gemini response for better UX
      setTimeout(() => {
        io.to(String(threadId)).emit('message:new', { threadId, message: populatedGeminiMsg });
      }, 300);
    } else if (result && result._id) {
      // Regular message - emit normally
      const populated = await Message.findById(result._id)
        .populate('sender', 'username avatarUrl')
        .lean();

      io.to(String(threadId)).emit('message:new', { threadId, message: populated });
    }
  }));

  // --------------------------------------
  // JOIN THREAD ROOM
  // --------------------------------------
  socket.on('thread:join', safeSocket(async ({ threadId }) => {
    if (!threadId) return;

    const { markRead } = await import('./src/services/messageService.js');

    await markRead(threadId, socket.user.id);

    socket.join(String(threadId));
  }));

  // --------------------------------------
  // LEAVE THREAD
  // --------------------------------------
  socket.on('thread:leave', ({ threadId }) => {
    if (!threadId) return;
    socket.leave(String(threadId));
  });

  // --------------------------------------
  // TYPING START
  // --------------------------------------
  socket.on('typing:start', ({ threadId }) => {
    if (!threadId) return;

    socket.to(String(threadId)).emit('typing', {
      threadId,
      userId: socket.user.id,
      typing: true
    });
  });

  // --------------------------------------
  // TYPING STOP
  // --------------------------------------
  socket.on('typing:stop', ({ threadId }) => {
    if (!threadId) return;

    socket.to(String(threadId)).emit('typing', {
      threadId,
      userId: socket.user.id,
      typing: false
    });
  });
});

app.set('io', io);

// ---------------------------
// START SERVER
// ---------------------------
connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`Example app listening on port ${process.env.PORT || port}`);
    });
  })
  .catch((error) => {
    console.error("MONGO Connection ERROR", error);
  });

