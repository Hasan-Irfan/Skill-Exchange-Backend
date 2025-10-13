import connectDB from './src/db/index.js';
import dotenv from 'dotenv';
import { app } from './src/app.js';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './src/model/user.model.js';

dotenv.config({
  path: '.env'
});

const port = process.env.PORT || 4000;

const server = http.createServer(app);

// Socket.IO setup with JWT auth
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    credentials: true
  }
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Unauthorized'));

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded?._id).select('_id username roles');
    if (!user) return next(new Error('Unauthorized'));
    socket.user = { id: String(user._id), username: user.username, roles: user.roles };
    next();
  } catch (e) {
    if (e?.name === 'TokenExpiredError') return next(new Error('Session expired'));
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const safeSocket = (handler) => (payload) => {
    Promise.resolve(handler(payload)).catch((err) => {
      console.error('Socket error:', err);
    });
  };

  // Send message through socket (save then broadcast)
  socket.on('message:send', safeSocket(async ({ threadId, text, attachments }) => {
    if (!threadId) return;
    const { sendMessage } = await import('./src/services/messageService.js');
    const msg = await sendMessage(threadId, socket.user.id, text, attachments || []);
    const { Message } = await import('./src/model/message.model.js');
    const populated = await Message.findById(msg._id).populate('sender', 'username avatarUrl').lean();
    io.to(String(threadId)).emit('message:new', { threadId, message: populated });
  }));
  // Join a thread room
  socket.on('thread:join', safeSocket(async ({ threadId }) => {
    if (!threadId) return;
    socket.join(String(threadId));
    const { markRead } = await import('./src/services/messageService.js');
    await markRead(threadId, socket.user.id);
  }));

  // Leave a thread room
  socket.on('thread:leave', ({ threadId }) => {
    if (!threadId) return;
    socket.leave(String(threadId));
  });

  // Typing indicators
  socket.on('typing:start', ({ threadId }) => {
    if (!threadId) return;
    socket.to(String(threadId)).emit('typing', { threadId, userId: socket.user.id, typing: true });
  });
  socket.on('typing:stop', ({ threadId }) => {
    if (!threadId) return;
    socket.to(String(threadId)).emit('typing', { threadId, userId: socket.user.id, typing: false });
  });
});

app.set('io', io);

connectDB()
  .then(() => {
    server.listen(port, () => {
      console.log(`Example app listening on port ${process.env.PORT || port}`)
    });
  })
  .catch((error) => {
    console.error("MONGO Connection ERROR", error);
  });

// import connectDB from './src/db/index.js'
// import dotenv from 'dotenv';
// import { app } from './src/app.js';

// dotenv.config({
//   path: '.env'
// });

// const port = 4000;

// connectDB().then(
//   app.listen(process.env.PORT || port , () => {
//     console.log(`Example app listening on port ${process.env.PORT || port}`)
//   })
// ).catch((error)=>{
//   console.error("MONGO Connection ERROR", error);
// });

