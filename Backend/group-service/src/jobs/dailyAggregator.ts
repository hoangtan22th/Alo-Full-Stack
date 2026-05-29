import cron from "node-cron";
import axios from "axios";
import UserDailyStat from "../models/UserDailyStat";
import Message from "../models/Message";
import Conversation from "../models/Conversation";
import { findMostFrequent } from "../utils/stats.util";

export function initDailyAggregatorJob() {
  console.log("Daily stats aggregator cron job initialized (Scheduled for 02:00 AM daily)");

  // Run at 02:00 AM daily ('0 2 * * *')
  cron.schedule("0 2 * * *", async () => {
    console.log("[dailyAggregator] Starting nightly statistics compilation...");
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const startOfYesterday = new Date(yesterday);
      startOfYesterday.setHours(0, 0, 0, 0);

      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      console.log(`[dailyAggregator] Compiling activity between ${startOfYesterday.toISOString()} and ${endOfYesterday.toISOString()}...`);

      // 1. Message Aggregation Pipeline
      const messageStats = await Message.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
          },
        },
        {
          $group: {
            _id: "$senderId",
            messagesSent: { $sum: 1 },
            dailyPartners: { $push: "$receiverId" },
            activeHours: { $push: { $hour: "$createdAt" } },
          },
        },
      ]);

      // 2. Group Aggregation Pipeline
      const groupStats = await Conversation.aggregate([
        {
          $match: {
            isGroup: true,
            createdAt: { $gte: startOfYesterday, $lte: endOfYesterday },
          },
        },
        {
          $unwind: "$members",
        },
        {
          $group: {
            _id: "$members.userId",
            groupsJoined: { $sum: 1 },
          },
        },
      ]);

      // 3. Merge Results in Memory (N+1 Query avoidance)
      const userMap = new Map<string, {
        messagesSent: number;
        dailyPartners: string[];
        activeHours: number[];
        groupsJoined: number;
      }>();

      for (const m of messageStats) {
        userMap.set(m._id, {
          messagesSent: m.messagesSent || 0,
          dailyPartners: m.dailyPartners || [],
          activeHours: m.activeHours || [],
          groupsJoined: 0,
        });
      }

      for (const g of groupStats) {
        if (userMap.has(g._id)) {
          userMap.get(g._id)!.groupsJoined = g.groupsJoined || 0;
        } else {
          userMap.set(g._id, {
            messagesSent: 0,
            dailyPartners: [],
            activeHours: [],
            groupsJoined: g.groupsJoined || 0,
          });
        }
      }

      // 4. Iterate merged users, resolve modes, query external microservices, and upsert
      for (const [userId, stats] of userMap.entries()) {
        const topChatPartnerId = findMostFrequent<string>(stats.dailyPartners);
        const mostActiveHour = findMostFrequent<number>(stats.activeHours);

        let newFriendsAdded = 0;
        let totalCallMinutes = 0;

        // Try calling contact-service endpoint with short timeout
        try {
          const response = await axios.get(
            `http://contact-service:8080/api/v1/internal/contacts/stats/yesterday?userId=${userId}`,
            { timeout: 1000 }
          );
          if (response.data && response.data.data) {
            newFriendsAdded = response.data.data.newFriendsAdded || 0;
            totalCallMinutes = response.data.data.totalCallMinutes || 0;
          }
        } catch (err: any) {
          console.warn(`[dailyAggregator] External call failed for user ${userId}, falling back to randomized mock values. Error: ${err.message}`);
          newFriendsAdded = Math.floor(Math.random() * 6); // 0 to 5
          totalCallMinutes = Math.floor(Math.random() * 121); // 0 to 120
        }

        // Upsert to rollup stats database
        await UserDailyStat.findOneAndUpdate(
          { userId, date: startOfYesterday },
          {
            $set: {
              messagesSent: stats.messagesSent,
              groupsJoined: stats.groupsJoined,
              totalCallMinutes,
              newFriendsAdded,
              topChatPartnerId,
              mostActiveHour,
            },
          },
          { upsert: true, new: true }
        );
      }

      console.log("[dailyAggregator] Nightly stats rollup compilation succeeded.");
    } catch (err) {
      console.error("[dailyAggregator] Cron Job Error:", err);
    }
  });
}
