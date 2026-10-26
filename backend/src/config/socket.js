import { Server } from 'socket.io';

let io = null;
const userSockets = new Map();

export const initSocket = (server) => {
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173'];
  allowedOrigins.push('https://iqraedu.in');
  allowedOrigins.push('https://www.iqraedu.in');

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    socket.on('register_user', (userId) => {
      socket.userId = userId;
      userSockets.set(userId, socket);
      console.log(`User ${userId} registered socket: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        userSockets.delete(socket.userId);
        console.log(`User ${socket.userId} socket disconnected`);
      }
    });
  });

  return io;
};

export const getIO = () => io;
export const getUserSocket = (userId) => userSockets.get(userId);
