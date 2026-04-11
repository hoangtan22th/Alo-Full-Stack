import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  // LƯU Ý: Đang comment phần này lại để test.
  // Sau này mở lại khi ráp vào auth-service của bạn kia.
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

  // Hardcode cho bước TEST lúc nãy:
  socket.data.userId = "123";
  next();
};
