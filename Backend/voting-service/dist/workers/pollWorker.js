"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPollWorker = exports.pollQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("../configs/redis");
const Poll_1 = require("../models/Poll");
const rabbitmq_1 = require("../configs/rabbitmq");
exports.pollQueue = new bullmq_1.Queue('pollQueue', {
    connection: redis_1.redisConnection,
});
const initPollWorker = () => {
    const worker = new bullmq_1.Worker('pollQueue', async (job) => {
        const { pollId } = job.data;
        console.log(`Processing expiration for poll: ${pollId}`);
        try {
            const poll = await Poll_1.Poll.findById(pollId);
            if (poll && poll.status === 'OPEN') {
                poll.status = 'CLOSED';
                await poll.save();
                console.log(`Poll ${pollId} closed automatically due to expiration.`);
                // Publish event to chat and realtime exchanges
                await rabbitmq_1.rabbitMQService.publishExchange('chat_exchange', 'poll.closed', {
                    conversationId: poll.conversationId,
                    pollId: poll._id,
                    isAutoClosed: true,
                });
                await rabbitmq_1.rabbitMQService.publishExchange('realtime_exchange', 'poll.updated', {
                    conversationId: poll.conversationId,
                    pollId: poll._id,
                });
            }
        }
        catch (error) {
            console.error(`Failed to close poll ${pollId}:`, error);
        }
    }, { connection: redis_1.redisConnection });
    worker.on('completed', (job) => {
        console.log(`Job ${job.id} has completed!`);
    });
    worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} has failed with ${err.message}`);
    });
    return worker;
};
exports.initPollWorker = initPollWorker;
