"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRabbitMQ = connectRabbitMQ;
exports.getChannel = getChannel;
exports.publishToRealtime = publishToRealtime;
exports.closeRabbitMQ = closeRabbitMQ;
const amqplib_1 = __importDefault(require("amqplib"));
let connection = null;
let channel = null;
const RABBITMQ_URL = process.env.RABBITMQ_URL || `amqp://${process.env.RABBITMQ_USER || 'guest'}:${process.env.RABBITMQ_PASSWORD || 'guest'}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || '5672'}${process.env.RABBITMQ_VHOST || '/'}`;
async function connectRabbitMQ() {
    try {
        console.log('[RabbitMQ] Connecting to RabbitMQ...');
        connection = await amqplib_1.default.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue('realtime_events', { durable: true });
        console.log('[RabbitMQ] Connected successfully and asserted realtime_events queue.');
        connection.on('error', (err) => {
            console.error('[RabbitMQ] Connection error:', err);
            connection = null;
            channel = null;
        });
        connection.on('close', () => {
            console.warn('[RabbitMQ] Connection closed');
            connection = null;
            channel = null;
        });
        return channel;
    }
    catch (error) {
        console.error('[RabbitMQ] Connection failed:', error);
        throw error;
    }
}
function getChannel() {
    if (!channel)
        throw new Error('RabbitMQ channel not initialized.');
    return channel;
}
async function publishToRealtime(event, payload) {
    try {
        const ch = getChannel();
        const messageBuffer = Buffer.from(JSON.stringify({
            event,
            room: payload.room,
            target: payload.target,
            data: payload.data,
        }));
        ch.sendToQueue('realtime_events', messageBuffer, {
            persistent: true,
        });
        console.log(`[RabbitMQ] Published event '${event}' to realtime_events queue.`);
    }
    catch (error) {
        console.error(`[RabbitMQ] Failed to publish event '${event}':`, error);
    }
}
async function closeRabbitMQ() {
    try {
        if (channel) {
            await channel.close();
            channel = null;
        }
        if (connection) {
            await connection.close();
            connection = null;
        }
        console.log('[RabbitMQ] Connection closed gracefully');
    }
    catch (error) {
        console.error('[RabbitMQ] Error closing connection:', error);
    }
}
//# sourceMappingURL=rabbitmq.js.map