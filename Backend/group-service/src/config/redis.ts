import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

export const redisClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });

export async function initRedis() {
  await redisClient.connect();
  console.log("Redis connected successfully for group-service caching.");
}
