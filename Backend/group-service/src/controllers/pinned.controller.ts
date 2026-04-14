// src/controllers/pinned.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import PinnedConversation from "../models/PinnedConversation";

// Helper check ObjectId
const isValidId = (id: string) => mongoose.Types.ObjectId.isValid(id);

// 1. Ghim hoặc Bỏ ghim cuộc hội thoại
export const togglePin = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.headers["x-user-id"] || "").toString();
    const conversationId = (req.params["conversationId"] || "").toString();

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!conversationId || !isValidId(conversationId)) {
      res.status(400).json({ error: "ID hội thoại không hợp lệ" });
      return;
    }

    // Kiểm tra xem đã ghim chưa
    const existing = await PinnedConversation.findOne({ userId, conversationId });

    const { default: rabbitMQProducer } = require("../services/rabbitMQProducer");

    if (existing) {
      // Đã ghim -> Bỏ ghim
      await PinnedConversation.deleteOne({ _id: existing._id });
      
      // Realtime Sync
      rabbitMQProducer.publishPinUpdated(userId, conversationId, false).catch(console.error);
      
      res.json({ isPinned: false, message: "Đã bỏ ghim" });
    } else {
      // Chưa ghim -> Ghim
      const newPin = new PinnedConversation({ userId, conversationId });
      await newPin.save();
      
      // Realtime Sync
      rabbitMQProducer.publishPinUpdated(userId, conversationId, true).catch(console.error);
      
      res.status(201).json({ isPinned: true, message: "Đã ghim thành công" });
    }
  } catch (error: any) {
    console.error("Error in togglePin:", error);
    res.status(500).json({ error: error.message });
  }
};

// 2. Lấy danh sách ID các hội thoại đã ghim
export const getPinnedList = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.headers["x-user-id"] || "").toString();
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const pinned = await PinnedConversation.find({ userId }).select("conversationId");
    const pinnedIds = pinned.map(p => p.conversationId.toString());

    res.json(pinnedIds);
  } catch (error: any) {
    console.error("Error in getPinnedList:", error);
    res.status(500).json({ error: error.message });
  }
};
