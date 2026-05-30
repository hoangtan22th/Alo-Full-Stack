import { Request, Response } from "express";
import { presenceClient } from "../config/redis";

export const getBulkPresence = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ success: false, message: "userIds must be an array" });
    }

    const results: Record<string, { isOnline: boolean; lastActiveAt: number }> = {};

    // Use pipeline or multiple hGets
    // For simplicity and since we are using node-redis
    const promises = userIds.map(async (id) => {
      const presenceStr = await presenceClient.hGet(`presence:users`, id);
      if (presenceStr) {
        const presence = JSON.parse(presenceStr);
        results[id] = {
          isOnline: presence.status === "online",
          lastActiveAt: presence.last_active || 0,
        };
      } else {
        results[id] = { isOnline: false, lastActiveAt: 0 };
      }
    });

    await Promise.all(promises);

    return res.status(200).json({
      status: 200,
      data: results
    });
  } catch (error) {
    console.error("Error in getBulkPresence:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getMetrics = async (req: Request, res: Response) => {
  try {
    const totalTracked = await presenceClient.hLen(`presence:users`);
    const onlineCountStr = await presenceClient.get(`presence:stats:online_count`);
    const onlineCount = onlineCountStr ? parseInt(onlineCountStr, 10) : 0;

    return res.status(200).json({
      status: 200,
      data: {
        totalTracked,
        onlineCount,
        onlineUserIds: [] // Kept for structural compatibility with any existing clients
      }
    });
  } catch (error) {
    console.error("Error in getMetrics:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
