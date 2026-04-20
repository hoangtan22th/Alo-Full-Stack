"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rabbitMQService = void 0;
const amqplib_1 = __importDefault(require("amqplib"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class RabbitMQService {
    connection = null;
    channel = null;
    URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    async connect() {
        try {
            this.connection = await amqplib_1.default.connect(this.URL);
            this.channel = await this.connection.createChannel();
            console.log('RabbitMQ Connected');
        }
        catch (error) {
            console.error('RabbitMQ connection error:', error);
        }
    }
    async publishExchange(exchange, routingKey, message) {
        if (!this.channel) {
            console.error('RabbitMQ Channel is not created');
            return;
        }
        try {
            await this.channel.assertExchange(exchange, 'direct', { durable: true });
            this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));
        }
        catch (error) {
            console.error('RabbitMQ publish error:', error);
        }
    }
}
exports.rabbitMQService = new RabbitMQService();
