import cron from "node-cron";
import axios from "axios";
import mongoose, { Schema } from "mongoose";
import UserDailyStat from "../models/UserDailyStat";
import Conversation from "../models/Conversation";
import { findMostFrequent } from "../utils/stats.util";

// ─── TEMPORARY HACK FOR TESTING ────────────────────────────────────────────────
// Targets TODAY (instead of yesterday) and runs immediately on startup.
// Uses a SEPARATE connection to alo_message_db to query the real Message collection.
// Revert: restore "yesterday" date logic and uncomment cron.schedule below.
// ───────────────────────────────────────────────────────────────────────────────

// ── Minimal "read-only" Message schema for cross-DB aggregation ───────────────
// Matches the real schema in message-service (has senderId + conversationId, no receiverId)
const remoteMsgSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId },
    senderId: { type: String },
  },
  { timestamps: true, strict: false }  // strict: false = tolerate extra fields
);
// ─────────────────────────────────────────────────────────────────────────────

async function runAggregationNow() {
  console.log("[dailyAggregator] Starting statistics compilation (HACK: targeting TODAY)...");
  try {
    // ── HACK: use today instead of yesterday ──────────────────────────────────
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    // ─────────────────────────────────────────────────────────────────────────

    console.log(`[dailyAggregator] Compiling activity between ${startOfToday.toISOString()} and ${endOfToday.toISOString()}...`);

    // ── 1. Connect to alo_message_db (separate connection) ───────────────────
    const msgDbUri = (process.env.MONGODB_URI as string).replace(
      /\/[^/?]+(\?|$)/,
      "/alo_message_db$1"
    );
    let msgConn: mongoose.Connection;
    try {
      msgConn = mongoose.createConnection(msgDbUri);
      await msgConn.asPromise();
      console.log(`[dailyAggregator] Connected to message DB: ${msgConn.host}/${msgConn.name}`);
    } catch (connErr: any) {
      console.error("[dailyAggregator] Cannot connect to alo_message_db:", connErr.message);
      return;
    }

    const RemoteMessage = msgConn.model("Message", remoteMsgSchema, "messages");

    // ── 2. Message Aggregation Pipeline (on alo_message_db.messages) ─────────
    // Group by senderId + conversationId to get per-user message counts
    // and the list of unique conversations they chatted in (to derive partner).
    const messageStats = await RemoteMessage.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lte: endOfToday },
          senderId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$senderId",
          messagesSent: { $sum: 1 },
          // Collect all conversationIds for finding the "top chat partner"
          conversationIds: { $addToSet: "$conversationId" },
          // ── FIX: Use timezone-aware $hour so 3 PM ICT → 15, not 8 (UTC) ──
          activeHours: {
            $push: {
              $hour: {
                date: "$createdAt",
                timezone: "Asia/Ho_Chi_Minh",
              },
            },
          },
        },
      },
    ]);

    await msgConn.close();
    console.log(`[dailyAggregator] Message aggregation returned ${messageStats.length} user(s).`);

    // ── 3. Group Aggregation Pipeline (on alo_group_db — same DB) ────────────
    // Count by members.joinedAt (when user joined), NOT conversation.createdAt
    const groupStats = await Conversation.aggregate([
      {
        $match: {
          isGroup: true,
        },
      },
      {
        $unwind: "$members",
      },
      {
        $match: {
          "members.joinedAt": { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: "$members.userId",
          groupsJoined: { $sum: 1 },
        },
      },
    ]);

    // ── 4. Merge Results in Memory ────────────────────────────────────────────
    const userMap = new Map<string, {
      messagesSent: number;
      conversationIds: string[];  // ObjectId strings
      activeHours: number[];
      groupsJoined: number;
    }>();

    for (const m of messageStats) {
      userMap.set(m._id, {
        messagesSent: m.messagesSent || 0,
        conversationIds: (m.conversationIds || []).map((id: any) => String(id)),
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
          conversationIds: [],
          activeHours: [],
          groupsJoined: g.groupsJoined || 0,
        });
      }
    }

    // ── 5. Resolve top chat partner from Conversation collection ─────────────
    // For each user, look at their most-used conversationId (1-1 conversations)
    // and find the OTHER participant as topChatPartnerId.
    async function resolveTopPartner(userId: string, conversationIds: string[]): Promise<string | null> {
      if (conversationIds.length === 0) return null;
      try {
        // Find the 1-on-1 conversation among their conversations
        const topConvo = await Conversation.findOne({
          _id: { $in: conversationIds.map(id => new mongoose.Types.ObjectId(id)) },
          isGroup: false,
          "members.userId": userId,
        }).select("members");

        if (!topConvo) return null;
        const partner = topConvo.members?.find((m: any) => String(m.userId) !== userId);
        return partner ? String(partner.userId) : null;
      } catch {
        return null;
      }
    }

    // ── 6. Upsert each user's stats ───────────────────────────────────────────
    for (const [userId, stats] of userMap.entries()) {
      const topChatPartnerId = await resolveTopPartner(userId, stats.conversationIds);
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
        console.warn(`[dailyAggregator] contact-service unreachable for ${userId}, defaulting to 0. Error: ${err.message}`);
        newFriendsAdded = 0;
        totalCallMinutes = 0;
      }

      await UserDailyStat.findOneAndUpdate(
        { userId, date: startOfToday },
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

      console.log(`[dailyAggregator] Upserted stats for user ${userId}: msgs=${stats.messagesSent}, groups=${stats.groupsJoined}, topPartner=${topChatPartnerId}`);
    }

    console.log(`[dailyAggregator] Stats rollup succeeded for ${userMap.size} user(s).`);
  } catch (err) {
    console.error("[dailyAggregator] Aggregation Error:", err);
  }
}

export function initDailyAggregatorJob() {
  console.log("[dailyAggregator] Initialized — running aggregation NOW for TODAY (HACK mode).");

  // ── HACK: run immediately on startup ─────────────────────────────────────
  runAggregationNow();
  // ─────────────────────────────────────────────────────────────────────────

  // ── ORIGINAL cron schedule (commented out during testing) ─────────────────
  // cron.schedule("0 2 * * *", async () => {
  //   console.log("[dailyAggregator] Starting nightly statistics compilation...");
  //   runAggregationNow();
  // });
  // ─────────────────────────────────────────────────────────────────────────
}
