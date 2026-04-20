import { Poll, IPollOption } from '../models/Poll';
import { PollVote } from '../models/PollVote';
import { rabbitMQService } from '../configs/rabbitmq';
import { pollQueue } from '../workers/pollWorker';
import { Types } from 'mongoose';

export class PollService {
  public async createPoll(data: any): Promise<any> {
    const { conversationId, creatorId, question, options, settings, expiresAt } = data;

    // Validate options
    if (!options || options.length < 2) {
      throw new Error('A poll must have at least 2 options');
    }

    const pollOptions: IPollOption[] = options.map((opt: string) => ({
      text: opt,
      addedBy: creatorId,
    }));

    const poll = new Poll({
      conversationId,
      creatorId,
      question,
      options: pollOptions,
      settings: settings || {},
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      status: 'OPEN',
    });

    const savedPoll = await poll.save();

    // Publish event to message-service to create a system message
    await rabbitMQService.publishExchange('chat_exchange', 'poll.created', {
      conversationId,
      creatorId,
      pollId: savedPoll._id,
      question: savedPoll.question,
      type: 'poll',
    });

    // Add job to Queue if expiresAt exists
    if (poll.expiresAt) {
      const delay = new Date(poll.expiresAt).getTime() - Date.now();
      if (delay > 0) {
        await pollQueue.add('expirePoll', { pollId: savedPoll._id }, { delay });
      } else {
        // If expired already, close immediately
        poll.status = 'CLOSED';
        await poll.save();
      }
    }

    return savedPoll;
  }

  public async getPollsByConversation(conversationId: string, limit: number = 20, cursor?: string): Promise<any> {
    const query: any = { conversationId };
    if (cursor) {
      query._id = { $lt: new Types.ObjectId(cursor) };
    }

    const polls = await Poll.find(query).sort({ createdAt: -1 }).limit(limit);
    return polls;
  }

  public async getPollDetails(pollId: string): Promise<any> {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }
    return poll;
  }

  public async closePoll(pollId: string, userId: string): Promise<any> {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    if (poll.creatorId !== userId) {
      // Depending on rules, you might want group admins to also be able to close
      throw new Error('Only the creator can close this poll');
    }

    poll.status = 'CLOSED';
    await poll.save();

    // Publish event
    await rabbitMQService.publishExchange('chat_exchange', 'poll.closed', {
      conversationId: poll.conversationId,
      pollId: poll._id,
    });
    // Kích hoạt realtime 
    await rabbitMQService.publishToQueue('realtime_events', {
      room: poll.conversationId,
      event: 'POLL_UPDATED',
      data: { pollId }
    });

    return poll;
  }

  public async addOption(pollId: string, userId: string, text: string): Promise<any> {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    if (poll.status !== 'OPEN') {
      throw new Error('Poll is already closed');
    }

    if (!poll.settings.allowAddOptions && poll.creatorId !== userId) {
      throw new Error('Only the creator can add options to this poll');
    }

    poll.options.push({ text, addedBy: userId });
    await poll.save();

    await rabbitMQService.publishToQueue('realtime_events', {
      room: poll.conversationId,
      event: 'POLL_UPDATED',
      data: { pollId }
    });

    return poll;
  }

  public async vote(pollId: string, userId: string, optionIds: string[]): Promise<any> {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    if (poll.status !== 'OPEN') {
      throw new Error('Poll is closed');
    }

    if (!poll.settings.allowMultipleAnswers && optionIds.length > 1) {
      throw new Error('Multiple answers are not allowed for this poll');
    }

    // Verify all optionIds exist in poll.options
    const validOptionIds = poll.options.map(opt => (opt as any)._id.toString());
    for (const optId of optionIds) {
      if (!validOptionIds.includes(optId)) {
        throw new Error(`Invalid option ID: ${optId}`);
      }
    }

    // Replace old votes for this user in this poll
    await PollVote.deleteMany({ pollId, userId });

    const newVotes = optionIds.map(optId => ({
      pollId,
      optionId: optId,
      userId,
    }));

    if (newVotes.length > 0) {
      await PollVote.insertMany(newVotes);
    }

    // Publish event to realtime-service
    await rabbitMQService.publishToQueue('realtime_events', {
      room: poll.conversationId,
      event: 'POLL_UPDATED',
      data: { pollId }
    });

    return { message: 'Voted successfully' };
  }

  public async getPollResults(pollId: string, requestUserId: string): Promise<any> {
    const poll = await Poll.findById(pollId);
    if (!poll) {
      throw new Error('Poll not found');
    }

    // Get all votes for this poll
    const votes = await PollVote.find({ pollId });

    // Enforce visibility settings
    let hasVoted = false;
    if (poll.settings.hideResultsUntilVoted) {
      hasVoted = votes.some(v => v.userId === requestUserId);
      if (!hasVoted && poll.status === 'OPEN') {
         return {
           _id: poll._id,
           hidden: true,
           message: "You must vote to see the results.",
         };
      }
    }

    // Aggregate counts
    const results = poll.options.map((opt: any) => {
      const optionVotes = votes.filter(v => v.optionId.toString() === opt._id.toString());
      return {
        optionId: opt._id,
        text: opt.text,
        count: optionVotes.length,
        voterCount: optionVotes.length,
        voters: poll.settings.hideVoters ? [] : optionVotes.map(v => ({
          userId: (v as any).userId,
          votedAt: (v as any).createdAt || new Date()
        }))
      };
    });

    return {
      _id: poll._id,
      question: poll.question,
      status: poll.status,
      totalVotes: votes.length,
      results,
    };
  }
}

export const pollService = new PollService();
