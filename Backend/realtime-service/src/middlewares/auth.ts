import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  // NOTE: Commented out for testing frontend easily.
  // Restore this block when integrating with auth-service.
  /*
  const token = socket.handshake.auth.token || socket.handshake.headers["authorization"]?.replace("Bearer ", "");
  if (!token) return next(new Error("Authentication error: No token provided"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as { userId: string };
    socket.data.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
  */

  // Hardcode for testing setup
  socket.data.userId = "123";
  next();
};
