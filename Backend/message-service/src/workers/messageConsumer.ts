import { getChannel, QUEUES } from '../config/rabbitmq';
import { getIO } from '../config/socket';

/**
 * Message Consumer Worker
 * Listens to message_queue from RabbitMQ and broadcasts to clients via Socket.io
 * THIS IS THE CONSUMER SIDE:
 * - Receives events from RabbitMQ
 * - Broadcasts to room via Socket.io
 */

export async function startMessageConsumer(): Promise<void> {
  try {
    const channel = getChannel();
    const io = getIO();

    console.log('[MessageConsumer] Starting message consumer...');

    // Set prefetch count to control concurrency
    await channel.prefetch(1);

    // Setup consumer
    channel.consume(
      QUEUES.MESSAGE,
      async (msg) => {
        if (!msg) return;

        try {
          const content = msg.content.toString();
          const event = JSON.parse(content);

          console.log(`[MessageConsumer] Received event: ${event.type}`);

          const { type, data } = event;

          // Handle different message event types
          if (type === 'message.created') {
            // Broadcast message to room
            const { conversationId, _id, senderId, content, type: msgType, metadata, createdAt } = data;

            io.to(conversationId).emit('message-received', {
              _id,
              conversationId,
              senderId,
              content,
              type: msgType,
              metadata,
              isRead: false,
              createdAt,
              timestamp: new Date().toISOString(),
            });

            console.log(`[MessageConsumer] Broadcasted message to room: ${conversationId}`);
          } else if (type === 'message.updated') {
            const { conversationId, _id, content } = data;

            io.to(conversationId).emit('message-updated', {
              _id,
              conversationId,
              content,
              timestamp: new Date().toISOString(),
            });

            console.log(`[MessageConsumer] Broadcasted message update to room: ${conversationId}`);
          } else if (type === 'message.deleted') {
            const { conversationId, messageId } = data;

            io.to(conversationId).emit('message-deleted', {
              messageId,
              conversationId,
              timestamp: new Date().toISOString(),
            });

            console.log(`[MessageConsumer] Broadcasted message deletion to room: ${conversationId}`);
          }

          // Acknowledge message
          channel.ack(msg);
        } catch (error) {
          console.error('[MessageConsumer] Error processing message:', error);
          // Reject and requeue
          channel.nack(msg, false, true);
        }
      },
      { noAck: false }
    );

    console.log('[MessageConsumer] Message consumer started successfully');
  } catch (error) {
    console.error('[MessageConsumer] Failed to start message consumer:', error);
    throw error;
  }
}
