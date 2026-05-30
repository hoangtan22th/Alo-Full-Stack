import amqp from 'amqplib';

let connection: any = null;
let channel: any = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || `amqp://${process.env.RABBITMQ_USER || 'guest'}:${process.env.RABBITMQ_PASSWORD || 'guest'}@${process.env.RABBITMQ_HOST || 'localhost'}:${process.env.RABBITMQ_PORT || '5672'}${process.env.RABBITMQ_VHOST || '/'}`;

export async function connectRabbitMQ(): Promise<any> {
  try {
    console.log('[RabbitMQ] Connecting to RabbitMQ...');
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue('realtime_events', { durable: true });
    console.log('[RabbitMQ] Connected successfully and asserted realtime_events queue.');

    connection.on('error', (err: any) => {
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
  } catch (error) {
    console.error('[RabbitMQ] Connection failed:', error);
    throw error;
  }
}

export function getChannel(): any {
  if (!channel) throw new Error('RabbitMQ channel not initialized.');
  return channel;
}

export async function publishToRealtime(
  event: string,
  payload: { room?: string; target?: string; data: any }
): Promise<void> {
  try {
    const ch = getChannel();
    const messageBuffer = Buffer.from(
      JSON.stringify({
        event,
        room: payload.room,
        target: payload.target,
        data: payload.data,
      })
    );

    ch.sendToQueue('realtime_events', messageBuffer, {
      persistent: true,
    });
    console.log(`[RabbitMQ] Published event '${event}' to realtime_events queue.`);
  } catch (error) {
    console.error(`[RabbitMQ] Failed to publish event '${event}':`, error);
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
    console.log('[RabbitMQ] Connection closed gracefully');
  } catch (error) {
    console.error('[RabbitMQ] Error closing connection:', error);
  }
}
