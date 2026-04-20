import { Request, Response } from "express";
import mongoose from "mongoose";
import Reminder from "../models/Reminder";
import Conversation from "../models/Conversation";
import rabbitMQProducer from "../services/rabbitMQProducer";

// Helper check ObjectId
const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

export const getRemindersByConversation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = (req.params["groupId"] || "").toString();
    if (!isValidId(groupId)) {
      res.status(400).json({ error: "ID nhóm không hợp lệ" });
      return;
    }

    const reminders = await Reminder.find({
      conversationId: groupId,
      status: { $ne: "CANCELLED" },
    }).sort({ time: 1 });

    res.json({ status: 200, data: reminders });
  } catch (error: any) {
    console.error("Error in getRemindersByConversation:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createReminder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const groupId = (req.params["groupId"] || "").toString();
    const creatorId = (req.headers["x-user-id"] || "").toString();
    const { title, time, repeat, repeatDays, remindFor } = req.body;

    if (!isValidId(groupId)) {
      res.status(400).json({ error: "ID nhóm không hợp lệ" });
      return;
    }

    if (!title || !time) {
      res.status(400).json({ error: "Tiêu đề và thời gian là bắt buộc" });
      return;
    }

    const conversation = await Conversation.findById(groupId);
    if (!conversation) {
      res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện" });
      return;
    }

    // Check permissions
    const member = conversation.members.find(
      (m) => m.userId.toString() === creatorId,
    );
    if (!member) {
      res.status(403).json({ error: "Bạn không phải thành viên nhóm" });
      return;
    }

    const isManager = member.role === "LEADER" || member.role === "DEPUTY";
    const permission = conversation.permissions?.createReminders || "EVERYONE";

    if (!isManager && permission === "ADMIN") {
      res
        .status(403)
        .json({ error: "Chỉ trưởng/phó nhóm mới có quyền tạo nhắc hẹn" });
      return;
    }

    const reminderTime = new Date(time);
    reminderTime.setSeconds(0, 0); // Đưa về đúng 0 giây

    const newReminder = new Reminder({
      conversationId: groupId,
      creatorId,
      title,
      time: reminderTime,
      repeat: repeat || "NONE",
      repeatDays: Array.isArray(repeatDays) ? repeatDays : [],
      remindFor: remindFor || "GROUP",
      status: "ACTIVE",
    });

    await newReminder.save();

    // Real-time broadcast
    rabbitMQProducer
      .publishReminderCreated(groupId, newReminder)
      .catch(console.error);

    res.status(201).json({ status: 201, data: newReminder });
  } catch (error: any) {
    console.error("Error in createReminder:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteReminder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const reminderId = (req.params["reminderId"] || "").toString();
    const requesterId = (req.headers["x-user-id"] || "").toString();

    if (!isValidId(reminderId)) {
      res.status(400).json({ error: "ID nhắc hẹn không hợp lệ" });
      return;
    }

    const reminder = await Reminder.findById(reminderId);
    if (!reminder) {
      res.status(404).json({ error: "Không tìm thấy nhắc hẹn" });
      return;
    }

    const conversation = await Conversation.findById(reminder.conversationId);
    let canDelete = false;

    if (reminder.creatorId.toString() === requesterId) {
      canDelete = true;
    } else if (conversation) {
      const member = conversation.members.find(
        (m) => m.userId.toString() === requesterId,
      );
      if (member?.role === "LEADER" || member?.role === "DEPUTY") {
        canDelete = true;
      }
    }

    if (!canDelete) {
      res.status(403).json({ error: "Bạn không có quyền xóa nhắc hẹn này" });
      return;
    }

    // Usually we just mark as cancelled or delete it
    await Reminder.findByIdAndDelete(reminderId);

    // Real-time broadcast
    rabbitMQProducer
      .publishReminderDeleted(reminder.conversationId.toString(), reminderId)
      .catch(console.error);

    res.json({ status: 200, message: "Đã xóa nhắc hẹn thành công" });
  } catch (error: any) {
    console.error("Error in deleteReminder:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateReminder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const reminderId = (req.params["reminderId"] || "").toString();
    const requesterId = (req.headers["x-user-id"] || "").toString();
    const { title, time, repeat, repeatDays, remindFor } = req.body;

    if (!isValidId(reminderId)) {
      res.status(400).json({ error: "ID nhắc hẹn không hợp lệ" });
      return;
    }

    const reminder = await Reminder.findById(reminderId);
    if (!reminder) {
      res.status(404).json({ error: "Không tìm thấy nhắc hẹn" });
      return;
    }

    // Check ownership: Only creator can update
    if (reminder.creatorId.toString() !== requesterId) {
      res.status(403).json({ error: "Bạn không có quyền chỉnh sửa nhắc hẹn này" });
      return;
    }

    // Update fields and reactivate if necessary
    if (title || time || repeat || repeatDays !== undefined) {
      reminder.status = "ACTIVE";
    }

    if (title) reminder.title = title;
    if (time) {
      const updatedTime = new Date(time);
      updatedTime.setSeconds(0, 0);
      reminder.time = updatedTime;
    }
    if (repeat) reminder.repeat = repeat;
    if (repeatDays !== undefined) reminder.repeatDays = repeatDays;
    if (remindFor) reminder.remindFor = remindFor;

    await reminder.save();

    // Real-time broadcast
    rabbitMQProducer
      .publishReminderUpdated(reminder.conversationId.toString(), reminder)
      .catch(console.error);

    res.json({ status: 200, data: reminder });
  } catch (error: any) {
    console.error("Error in updateReminder:", error);
    res.status(500).json({ error: error.message });
  }
};
