import { Request, Response } from 'express';
import { pollService } from '../services/pollService';

/**
 * Extract userId from x-user-id header (set by Gateway)
 */
function getUserIdFromHeader(req: Request): string | null {
  const userId = req.headers["x-user-id"];
  return typeof userId === "string" ? userId : null;
}

export class PollController {
  public async createPoll(req: Request, res: Response) {
    try {
      const { conversationId, question, options, settings, expiresAt } = req.body;
      const creatorId =
        (req as any).user?.id || getUserIdFromHeader(req) || req.body.creatorId;

      if (!creatorId) {
        return res.status(401).json({ message: "Unauthorized - missing x-user-id" });
      }

      const poll = await pollService.createPoll({
        conversationId,
        creatorId,
        question,
        options,
        settings,
        expiresAt,
      });

      res.status(201).json({ status: 201, data: poll });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  public async getPollsByConversation(req: Request, res: Response) {
    try {
      const conversationId = req.params.conversationId as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const cursor = req.query.cursor as string;

      const polls = await pollService.getPollsByConversation(conversationId, limit, cursor);
      res.status(200).json({ status: 200, data: polls });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  public async getPollDetails(req: Request, res: Response) {
    try {
      const pollId = req.params.pollId as string;
      const poll = await pollService.getPollDetails(pollId);
      res.status(200).json({ status: 200, data: poll });
    } catch (error: any) {
      res.status(404).json({ message: error.message });
    }
  }

  public async closePoll(req: Request, res: Response) {
    try {
      const pollId = req.params.pollId as string;
      const userId = (req as any).user?.id || getUserIdFromHeader(req) || req.body.userId; 

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - missing x-user-id" });
      }

      const poll = await pollService.closePoll(pollId, userId);
      res.status(200).json({ status: 200, data: poll });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  public async addOption(req: Request, res: Response) {
    try {
      const pollId = req.params.pollId as string;
      const { text } = req.body;
      const userId = (req as any).user?.id || getUserIdFromHeader(req) || req.body.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - missing x-user-id" });
      }

      const poll = await pollService.addOption(pollId, userId, text);
      res.status(200).json({ status: 200, data: poll });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  public async vote(req: Request, res: Response) {
    try {
      const pollId = req.params.pollId as string;
      const { optionIds } = req.body;
      const userId = (req as any).user?.id || getUserIdFromHeader(req) || req.body.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - missing x-user-id" });
      }

      const result = await pollService.vote(pollId, userId, optionIds);
      res.status(200).json({ status: 200, data: result });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  public async getPollResults(req: Request, res: Response) {
    try {
      const pollId = req.params.pollId as string;
      const userId = (req as any).user?.id || getUserIdFromHeader(req) || req.query.userId as string;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - missing x-user-id" });
      }

      const results = await pollService.getPollResults(pollId, userId);
      res.status(200).json({ status: 200, data: results });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}

export const pollController = new PollController();
