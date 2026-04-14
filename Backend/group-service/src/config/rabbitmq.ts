import amqp, { Connection, Channel } from 'amqplib';

let connection: any = null;
let channel: any = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}${process.env.RABBITMQ_VHOST || '/'}`;

export const EXCHANGES = {
  CHAT: 'chat_exchange',
};

export const ROUTING_KEYS = {
  CONVERSATION_CREATED: 'chat.conversation.created',
  CONVERSATION_UPDATED: 'chat.conversation.updated',
  CONVERSATION_REMOVED: 'chat.conversation.removed',
  CONVERSATION_PIN_UPDATED: 'chat.conversation.pin_updated',
  CONVERSATION_LABEL_UPDATED: 'chat.conversation.label_updated',
};

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

    // Khởi tạo Exchange loại 'topic'
    await channel.assertExchange(EXCHANGES.CHAT, 'topic', { durable: true });

    console.log('[RabbitMQ] Connected and exchange asserted in group-service');

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

export async function publishToQueue(
  routingKey: string,
  message: Record<string, any>,
  options: Record<string, any> = {}
): Promise<void> {
  try {
    const ch = getChannel();
    const messageBuffer = Buffer.from(JSON.stringify(message));
    ch.publish(EXCHANGES.CHAT, routingKey, messageBuffer, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
      ...options,
    });
    console.log(`[RabbitMQ] Published to '${routingKey}'`);
  } catch (error) {
    console.error(`[RabbitMQ] Failed to publish to '${routingKey}':`, error);
    throw error;
  }
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
