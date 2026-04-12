import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

export const pubClient = createClient({ url: process.env.REDIS_URL });
export const subClient = pubClient.duplicate();
export const presenceClient = pubClient.duplicate();

export async function initRedis() {
  await Promise.all([
    pubClient.connect(),
    subClient.connect(),
    presenceClient.connect(),
  ]);
  console.log("Redis connected successfully & ready for Pub/Sub and Presence.");
}
