import { io } from 'socket.io-client';

// For local development, default to http://localhost:5000
// For production, fall back to current window location
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

console.log(`Connecting Socket.io client to: ${SOCKET_URL}`);

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});
