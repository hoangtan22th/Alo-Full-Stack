import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../configs/redis';
import { Poll } from '../models/Poll';
import { rabbitMQService } from '../configs/rabbitmq';

export const pollQueue = new Queue('pollQueue', {
  connection: redisConnection,
});

export const initPollWorker = () => {
  const worker = new Worker(
    'pollQueue',
    async (job: Job) => {
      const { pollId } = job.data;
      console.log(`Processing expiration for poll: ${pollId}`);

      try {
        const poll = await Poll.findById(pollId);
        if (poll && poll.status === 'OPEN') {
          poll.status = 'CLOSED';
          await poll.save();

          console.log(`Poll ${pollId} closed automatically due to expiration.`);

          // Publish event to chat and realtime exchanges
          await rabbitMQService.publishExchange('chat_exchange', 'poll.closed', {
            conversationId: poll.conversationId,
            pollId: poll._id,
            isAutoClosed: true,
          });
          
          await rabbitMQService.publishExchange('realtime_exchange', 'poll.updated', {
            conversationId: poll.conversationId,
            pollId: poll._id,
          });
        }
      } catch (error) {
        console.error(`Failed to close poll ${pollId}:`, error);
      }
    },
    { connection: redisConnection }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} has completed!`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} has failed with ${err.message}`);
  });

  return worker;
};
