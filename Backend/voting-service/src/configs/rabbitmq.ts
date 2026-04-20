import amqp, { Connection, Channel } from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

class RabbitMQService {
  private connection: any = null;
  private channel: any = null;
  private readonly URL: string = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

  async connect() {
    try {
      this.connection = (await amqp.connect(this.URL)) as any;
      if (this.connection) {
        this.channel = await this.connection.createChannel();
        console.log('RabbitMQ Connected');
      }
    } catch (error) {
      console.error('RabbitMQ connection error:', error);
    }
  }

  async publishExchange(exchange: string, routingKey: string, message: any) {
    if (!this.channel) {
      console.error('RabbitMQ Channel is not created');
      return;
    }
    try {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });
      this.channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)));
    } catch (error) {
      console.error('RabbitMQ publish error:', error);
    }
  }

  async publishToQueue(queue: string, message: any) {
    if (!this.channel) {
      console.error('RabbitMQ Channel is not created');
      return;
    }
    try {
      this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
    } catch (error) {
      console.error('RabbitMQ queue publish error:', error);
    }
  }
}

export const rabbitMQService = new RabbitMQService();
