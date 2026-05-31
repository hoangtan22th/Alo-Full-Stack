// src/controllers/broadcast.controller.ts
import { Request, Response } from 'express';
import { SYSTEM_BOTS, BotType } from '../constants/bots';
import { processPersistentBroadcast } from '../workers/broadcastWorker';
import { BroadcastCampaign } from '../models/BroadcastCampaign';

export const createBroadcast = async (req: Request, res: Response) => {
  try {
    const { title, content, botType } = req.body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Tiêu đề không được rỗng" });
    }
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Nội dung không được rỗng" });
    }
    if (title.length > 200) {
      return res.status(400).json({ success: false, message: "Vượt quá độ dài tiêu đề" });
    }
    if (content.length > 2000) {
      return res.status(400).json({ success: false, message: "Vượt quá độ dài nội dung" });
    }

    const senderId = SYSTEM_BOTS[botType as BotType] || SYSTEM_BOTS.SYSTEM;

    // 1. Create Campaign record
    const campaign = await BroadcastCampaign.create({
      title,
      content,
      senderId,
      status: 'PROCESSING'
    });

    const broadcastData = {
      title,
      content,
      senderId,
    };

    // 2. Fire-and-Forget with campaignId
    processPersistentBroadcast(campaign._id.toString(), broadcastData).catch((err) => {
      console.error('[BroadcastController] Background process error:', err);
    });

    return res.status(200).json({
      success: true,
      message: "Broadcast is being processed in the background.",
      data: campaign
    });
  } catch (error: any) {
    console.error('[BroadcastController] Error creating broadcast:', error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const getBroadcastHistory = async (req: Request, res: Response) => {
  try {
    const campaigns = await BroadcastCampaign.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    console.error('[BroadcastController] Error fetching history:', error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};
