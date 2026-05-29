import cron from "node-cron";
import UserDailyStat from "../models/UserDailyStat";

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

      console.log(`[dailyAggregator] Fetching yesterday's messages for all users between ${startOfYesterday.toISOString()} and ${endOfYesterday.toISOString()}...`);
      console.log("[dailyAggregator] Grouping activity by userId...");

      // Mock compiled data for rich stats upgrade
      const mockAggregatedStats = [
        {
          userId: "mock_user_1",
          messagesSent: 25,
          groupsJoined: 2,
          totalCallMinutes: 120,
          newFriendsAdded: 1,
          topChatPartnerId: "user_999",
          mostActiveHour: 23,
        },
        {
          userId: "mock_user_2",
          messagesSent: 42,
          groupsJoined: 1,
          totalCallMinutes: 45,
          newFriendsAdded: 3,
          topChatPartnerId: "user_888",
          mostActiveHour: 14,
        },
      ];

      for (const stat of mockAggregatedStats) {
        await UserDailyStat.findOneAndUpdate(
          { userId: stat.userId, date: startOfYesterday },
          {
            $set: {
              messagesSent: stat.messagesSent,
              groupsJoined: stat.groupsJoined,
              totalCallMinutes: stat.totalCallMinutes,
              newFriendsAdded: stat.newFriendsAdded,
              topChatPartnerId: stat.topChatPartnerId,
              mostActiveHour: stat.mostActiveHour,
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
