import { Server, Socket } from 'socket.io';
import { handleConnect } from './message.handlers';

/**
 * Setup Socket.io gateway/namespace handlers
 */
export function setupMessageGateway(io: Server): void {
  const messagesNamespace = io.of('/messages');

  console.log('[MessageGateway] Setting up /messages namespace');

  /**
   * Middleware: Lấy userId và Token bằng mọi cách (Headers, Auth, Query)
   */
  messagesNamespace.use((socket: Socket, next) => {
    // DEBUG: Log all available data
    console.log('[MessageGateway] Handshake Debug:');
    console.log('  Headers:', JSON.stringify(socket.handshake.headers));
    console.log('  Auth:', JSON.stringify(socket.handshake.auth));
    console.log('  Query:', JSON.stringify(socket.handshake.query));

    // --- 1. LẤY USER ID ---
    // Thử lấy từ Header (Gateway), nếu không có thì thử lấy từ Query (Client test trực tiếp)
    const userId = 
      (socket.handshake.headers['x-user-id'] as string) || 
      (socket.handshake.query.userId as string) ||
      (socket.handshake.auth?.userId as string);

    // --- 2. LẤY TOKEN (ƯƯTIÊN Query vì Gateway truyền qua đó) ---
     // HIỆN TẠI ĐANG LẤY TỪ HEADER Autho : BEarer....
    // Ưu tiên lấy từ Query string (Gateway forward được khi upgrade WS)
    const queryToken = socket.handshake.query.token as string;
    // Backup: Thử lấy từ Header Authorization
    const authHeader = socket.handshake.headers['authorization'] as string;
    // Backup: Thử lấy từ object auth (Cách cũ của socket.io)
    const authToken = socket.handshake.auth?.token as string;

    const rawToken = queryToken || authHeader || authToken;
    const token = rawToken?.startsWith('Bearer ') ? rawToken.split(' ')[1] : rawToken;

    if (!userId) {
      console.warn('[MessageGateway] Connection rejected: No userId found in any source');
      return next(new Error('Unauthorized: missing userId'));
    }

    // Lưu vào socket để dùng ở handler
    (socket as any).userId = userId;
    (socket as any).token = token;

    console.log(`[MessageGateway] Extracted - User: ${userId}, HasToken: ${!!token}`);
    next();
  });

  /**
   * Connection handler
   */
  messagesNamespace.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`[MessageGateway] New connection: ${socket.id} (User: ${userId})`);
    handleConnect(socket);
  });

  console.log('[MessageGateway] /messages namespace initialized');
}

/**
 * Setup Presence namespace
 */
export function setupPresenceGateway(io: Server): void {
  const presenceNamespace = io.of('/presence');

  presenceNamespace.use((socket: Socket, next) => {
    const userId = 
      (socket.handshake.headers['x-user-id'] as string) || 
      (socket.handshake.query.userId as string);

    if (!userId) return next(new Error('Unauthorized: no userId'));

    (socket as any).userId = userId;
    next();
  });

  presenceNamespace.on('connection', (socket: Socket) => {
    console.log(`[PresenceGateway] New connection: ${socket.id} (User: ${(socket as any).userId})`);
  });
}