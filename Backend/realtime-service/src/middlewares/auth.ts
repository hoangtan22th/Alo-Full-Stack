import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth.token || socket.handshake.headers["authorization"]?.replace("Bearer ", "");
  if (!token) return next(new Error("Authentication error: No token provided"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as { sub?: string, userId?: string };
    
    // Spring Boot Jwts thường đẩy UserId vào Subject (sub) thay vì userId.
    const userId = decoded.sub || decoded.userId;
    
    if (!userId) {
      return next(new Error("Authentication error: Token missing user identifier (sub/userId)"));
    }

    socket.data.userId = String(userId);
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
};
