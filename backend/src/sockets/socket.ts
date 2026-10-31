import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../config/logger';
import { UserRole } from '../types/roles';

let io: Server | null = null;

export function initSocketIO(httpServer: HttpServer, clientUrl: string): Server {
  io = new Server(httpServer, {
    cors: {
      origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true
    }
  });

  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        (socket.handshake.headers?.cookie && parseCookieToken(socket.handshake.headers.cookie));

      if (!token) {
        return next(new Error('Authentication token required for WebSocket connection'));
      }

      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch (err: any) {
      logger.warn(`Socket.IO authentication failed: ${err.message}`);
      next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.info(`🔌 WebSocket client connected: ${user.email} (${user.role}) - Socket ID: ${socket.id}`);

    // Join room for this user role
    socket.join(`role:${user.role}`);
    // Join room for this specific user
    socket.join(`user:${user.id}`);

    socket.on('disconnect', () => {
      logger.info(`🔌 WebSocket client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

export function emitToRoles(roles: UserRole[], event: string, payload: any): void {
  if (!io) return;
  roles.forEach((role) => {
    io?.to(`role:${role}`).emit(event, payload);
  });
}

export function emitToAll(event: string, payload: any): void {
  if (!io) return;
  io.emit(event, payload);
}

function parseCookieToken(cookieString: string): string | null {
  const match = cookieString.match(/access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
