// server.js - Main server file for Socket.io chat application

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config.js';
import { socketAuth } from './sockets/auth.js';
import messageRoutes from "./routes/messageRoutes.js";
app.use("/api/messages", messageRoutes);


dotenv.config();
connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// TEMPORARY IN-MEMORY STORE (Will be replaced with MongoDB models)
const users = {};
const messages = [];
const typingUsers = {};

// SOCKET AUTH MIDDLEWARE
io.use(socketAuth);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}`);

  socket.on('user_join', (username) => {
    users[socket.id] = { username, id: socket.userId };
    io.emit('user_list', Object.values(users));
    io.emit('user_joined', { username, id: socket.userId });
  });

  socket.on('send_message', (messageData) => {
    const message = {
      ...messageData,
      id: Date.now(),
      sender: users[socket.id]?.username || 'Unknown',
      senderId: socket.userId,
      timestamp: new Date().toISOString(),
    };

    messages.push(message);
    if (messages.length > 100) messages.shift();

    io.emit('receive_message', message);
  });

  socket.on('typing', (state) => {
    typingUsers[socket.id] = state ? users[socket.id]?.username : undefined;
    io.emit('typing_users', Object.values(typingUsers).filter(Boolean));
  });

  socket.on('private_message', ({ to, message }) => {
    const msg = {
      id: Date.now(),
      sender: users[socket.id]?.username,
      senderId: socket.userId,
      message,
      timestamp: new Date().toISOString(),
      isPrivate: true,
    };

    socket.to(to).emit('private_message', msg);
    socket.emit('private_message', msg);
  });

  socket.on('disconnect', () => {
    const user = users[socket.id];
    if (user) io.emit('user_left', user);

    delete users[socket.id];
    delete typingUsers[socket.id];

    io.emit('user_list', Object.values(users));
    io.emit('typing_users', Object.values(typingUsers));
  });
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.send('Socket.io server running'));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
