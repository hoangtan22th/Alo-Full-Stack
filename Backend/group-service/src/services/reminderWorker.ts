import Reminder, { IReminder } from "../models/Reminder";
import Conversation from "../models/Conversation";
import rabbitMQProducer from "./rabbitMQProducer";
import mongoose from "mongoose";

/**
 * Reminder Worker logic to check and process due reminders.
 * Uses a simple setInterval polling (every 60s) for reliability.
 */

// Helper to post system messages (since we are in group-service)
async function postSystemMessage(groupId: string, reminderTitle: string) {
  try {
    const gatewayUrl = process.env.GATEWAY_URL || "http://127.0.0.1:8888";
    // We use a mock system userId for the system message
    const systemUserId = "00000000-0000-0000-0000-000000000000";

    await fetch(`${gatewayUrl}/api/v1/messages`, {
      method: "POST",
      headers: {
        "X-User-Id": systemUserId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: groupId,
        type: "system",
        content: `🔔 NHẮC HẸN: ${reminderTitle}`,
        metadata: {
          isReminder: true,
          title: reminderTitle
        }
      }),
    });
  } catch (error) {
    console.error(`[reminderWorker] Failed to send system message:`, error);
  }
}

/**
 * Calculate the next Date for a recurring reminder.
 */
function calculateNextOccurrence(reminder: IReminder): Date | null {
  const now = new Date();
  const baseDate = new Date(reminder.time);

  // If the reminder is in the past, we start calculating from 'now' or 'baseDate'
  // But typically a reminder just fired, so we move forward from the current designated time.
  let nextDate = new Date(baseDate);

  switch (reminder.repeat) {
    case "DAILY":
      nextDate.setDate(nextDate.getDate() + 1);
      break;

    case "WEEKLY":
      nextDate.setDate(nextDate.getDate() + 7);
      break;

    case "MANY_DAYS_WEEKLY":
      const days = reminder.repeatDays;
      if (!days || days.length === 0) return null;
      // find next day in the list
      // 0 = Sunday, 6 = Saturday
      const currentDay = nextDate.getDay();
      const sortedDays = [...days].sort((a, b) => a - b);
      
      // Find the next day later in the same week
      const nextDayInWeek = sortedDays.find(d => d > currentDay);
      
      if (nextDayInWeek !== undefined) {
          const diff = nextDayInWeek - currentDay;
          nextDate.setDate(nextDate.getDate() + diff);
      } else {
          // Wrap to the first specified day in the next week
          const firstDay = sortedDays[0] ?? 0;
          const diff = (7 - currentDay) + firstDay;
          nextDate.setDate(nextDate.getDate() + diff);
      }
      break;

    case "MONTHLY":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;

    case "YEARLY":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;

    case "NONE":
    default:
      return null;
  }

  // Ensure we don't return a date in the past
  while (nextDate <= now) {
      if (reminder.repeat === "DAILY") nextDate.setDate(nextDate.getDate() + 1);
      else if (reminder.repeat === "WEEKLY") nextDate.setDate(nextDate.getDate() + 7);
      else if (reminder.repeat === "MONTHLY") nextDate.setMonth(nextDate.getMonth() + 1);
      else if (reminder.repeat === "YEARLY") nextDate.setFullYear(nextDate.getFullYear() + 1);
      else break;
  }

  return nextDate;
}

export const processReminders = async () => {
  try {
    const now = new Date();
    // Find active reminders that are due
    const dueReminders = await Reminder.find({
      status: "ACTIVE",
      time: { $lte: now },
    });

    if (dueReminders.length === 0) return;

    console.log(`[reminderWorker] Processing ${dueReminders.length} due reminders...`);

    for (const reminder of dueReminders) {
      console.log(`[reminderWorker] Processing reminder: ${reminder.title} (${reminder.remindFor})`);
      
      // 1. Dispatch Notification
      if (reminder.remindFor === "GROUP") {
        // Post system message for history
        await postSystemMessage(reminder.conversationId, reminder.title);
        
        // Also send direct REMINDER_DUE events to all members so they get notified regardless of screen
        try {
          const conversation = await Conversation.findById(reminder.conversationId);
          if (conversation && conversation.members) {
            console.log(`[reminderWorker] Notifying ${conversation.members.length} members for group reminder: ${reminder.title}`);
            for (const member of conversation.members) {
              await rabbitMQProducer.publishReminderDue(member.userId, {
                _id: reminder._id,
                title: reminder.title,
                conversationId: reminder.conversationId,
                remindFor: reminder.remindFor
              });
            }
          }
        } catch (err) {
          console.error(`[reminderWorker] Failed to fetch members for group reminder:`, err);
        }
      } else {
        // Send private socket event
        await rabbitMQProducer.publishReminderDue(reminder.creatorId, {
          _id: reminder._id,
          title: reminder.title,
          conversationId: reminder.conversationId,
          remindFor: reminder.remindFor
        });
      }

      // 2. Handle Recurrence or Completion
      if (reminder.repeat === "NONE") {
        reminder.status = "DONE";
      } else {
        const nextTime = calculateNextOccurrence(reminder);
        if (nextTime) {
          reminder.time = nextTime;
          console.log(`[reminderWorker] Rescheduled reminder '${reminder.title}' to ${nextTime}`);
        } else {
          reminder.status = "DONE";
        }
      }

      await reminder.save();
    }
  } catch (error) {
    console.error("[reminderWorker] Error processing reminders:", error);
  }
};

export const startReminderWorker = () => {
  console.log("🕒 Starting Reminder Worker (60s interval)...");
  // Run once immediately (optional)
  processReminders();
  // Schedule
  setInterval(processReminders, 10 * 1000);
};
