import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';

let ioServer: Server | null = null;

/**
 * Initialize Socket.io server
 */
export function initializeSocket(httpServer: HTTPServer): Server {
  ioServer = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || '*',
      credentials: process.env.SOCKET_CORS_CREDENTIALS === 'true',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  console.log('[Socket.io] Server initialized');

  // Connection event
  ioServer.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);
  });

  return ioServer;
}

/**
 * Get Socket.io server instance
 */
export function getIO(): Server {
  if (!ioServer) {
    throw new Error('Socket.io server not initialized. Call initializeSocket() first.');
  }
  return ioServer;
}

/**
 * Setup Socket.io namespaces
 */
export function setupNamespaces(io: Server): void {
  // Messages namespace
  const messagesNs = io.of('/messages');
  console.log('[Socket.io] /messages namespace created');

  // Presence namespace
  const presenceNs = io.of('/presence');

}
