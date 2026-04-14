import amqp, { Connection, Channel } from 'amqplib';

let connection: any = null;
let channel: any = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}${process.env.RABBITMQ_VHOST || '/'}`;

export async function connectRabbitMQ(): Promise<Channel> {
  try {
    // Nếu vhost là / thì không nên nối thêm / vào URL vì amqplib coi / đầu tiên là phân tách
    const vhost = process.env.RABBITMQ_VHOST === '/' ? '' : process.env.RABBITMQ_VHOST || '';
    const url = process.env.RABBITMQ_URL || `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}/${vhost}`;

    console.log('[RabbitMQ] Connecting to:', url.replace(/:.*@/, ':***@')); // Log masked URL
    
    connection = await amqp.connect(url) as any;
    channel = await connection.createChannel();

    if (!channel) {
        throw new Error('Could not create RabbitMQ channel');
    }

    // Quan trọng: Phải assert queue 'realtime_events' trước khi send để đảm bảo nó tồn tại
    await channel.assertQueue('realtime_events', { durable: true });

    console.log('[RabbitMQ] Connected and queue "realtime_events" asserted in group-service');

    connection?.on('error', (err: any) => {
      console.error('[RabbitMQ] Connection error:', err);
      connection = null;
      channel = null;
    });

    connection?.on('close', () => {
      console.warn('[RabbitMQ] Connection closed');
      connection = null;
      channel = null;
    });

    return channel;
  } catch (error) {
    console.error('[RabbitMQ] Connection failed:', error);
    throw error;
  }
}

export function getChannel(): Channel {
  if (!channel) throw new Error('RabbitMQ channel not initialized.');
  return channel;
}

export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    console.log('[RabbitMQ] Connection closed');
  } catch (error) {
    console.error('[RabbitMQ] Error closing connection:', error);
  }
}
