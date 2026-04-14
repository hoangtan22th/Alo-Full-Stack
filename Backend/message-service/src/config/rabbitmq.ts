import amqp, { Connection, Channel } from "amqplib";

// fix vội
// let connection: Connection | null = null;
// let channel: Channel | null = null;

let connection: any = null;
let channel: any = null;

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}${process.env.RABBITMQ_VHOST || "/"}`;

export const EXCHANGES = {
  CHAT: "chat_exchange",
};

export const QUEUES = {
  MESSAGE: "message_queue",
};

export const ROUTING_KEYS = {
  // Message events only
  MESSAGE_CREATED: "chat.message.created",
  MESSAGE_UPDATED: "chat.message.updated",
  MESSAGE_DELETED: "chat.message.deleted",
  MESSAGE_READ: "chat.message.read",
  CONVERSATION_UPDATED: "chat.conversation.updated",
  MESSAGE_REACTION: "chat.message.reaction.updated",
  MESSAGE_REVOKED: "chat.message.revoked",
};

/**
 * Kết nối tới RabbitMQ server
 */
export async function connectRabbitMQ(): Promise<Channel> {
  try {
    connection = (await amqp.connect(RABBITMQ_URL)) as any;
    channel = await connection.createChannel();

    if (!channel) {
      throw new Error("Could not create RabbitMQ channel");
    }

    console.log("[RabbitMQ] Connected successfully");

    // Khởi tạo Exchange loại 'topic'
    await channel.assertExchange(EXCHANGES.CHAT, "topic", { durable: true });

    // Khởi tạo Queue
    await channel.assertQueue(QUEUES.MESSAGE, { durable: true });

    // Bind các sự kiện tin nhắn
    await channel.bindQueue(QUEUES.MESSAGE, EXCHANGES.CHAT, "chat.message.*");

    // Bind sự kiện hội thoại
    await channel.bindQueue(
      QUEUES.MESSAGE,
      EXCHANGES.CHAT,
      "chat.conversation.*",
    );

    console.log(
      `[RabbitMQ] Queue '${QUEUES.MESSAGE}' ready for Message events`,
    );

    connection?.on("error", (err: any) => {
      console.error("[RabbitMQ] Connection error:", err);
      connection = null;
      channel = null;
    });

    connection?.on("close", () => {
      console.warn("[RabbitMQ] Connection closed");
      connection = null;
      channel = null;
    });

    return channel;
  } catch (error) {
    console.error("[RabbitMQ] Connection failed:", error);
    throw error;
  }
}

// ... Các hàm getChannel, publishToQueue, closeRabbitMQ giữ nguyên như cũ ...

export function getChannel(): Channel {
  if (!channel) throw new Error("RabbitMQ channel not initialized.");
  return channel;
}

export async function publishToQueue(
  routingKey: string,
  message: Record<string, any>,
  options: Record<string, any> = {},
): Promise<void> {
  try {
    const ch = getChannel();
    const messageBuffer = Buffer.from(JSON.stringify(message));
    ch.publish(EXCHANGES.CHAT, routingKey, messageBuffer, {
      persistent: true,
      contentType: "application/json",
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
    console.log("[RabbitMQ] Connection closed");
  } catch (error) {
    console.error("[RabbitMQ] Error closing connection:", error);
  }
}
