// import { getChannel, QUEUES } from '../config/rabbitmq';
// import { getIO } from '../config/socket';

// /**
//  * Presence Consumer Worker
//  * Listens to presence_queue from RabbitMQ and broadcasts presence updates to clients
//  * Handles: user typing, user online, user offline, user joined, user left
//  */

// export async function startPresenceConsumer(): Promise<void> {
//   try {
//     const channel = getChannel();
//     const io = getIO();

//     console.log('[PresenceConsumer] Starting presence consumer...');

//     // Set prefetch count
//     await channel.prefetch(1);

//     // Setup consumer
//     channel.consume(
//       QUEUES.PRESENCE,
//       async (msg) => {
//         if (!msg) return;

//         try {
//           const content = msg.content.toString();
//           const event = JSON.parse(content);

//           console.log(`[PresenceConsumer] Received event: ${event.type}`);

//           const { type, data } = event;

//           // Handle different presence event types
//           if (type === 'user.typing') {
//             const { conversationId, userId, isTyping } = data;

//             io.to(conversationId).emit('user-typing', {
//               userId,
//               conversationId,
//               isTyping,
//               timestamp: new Date().toISOString(),
//             });

//             console.log(`[PresenceConsumer] Broadcasted typing status: ${userId}`);
//           } else if (type === 'user.online') {
//             const { conversationId, userId, socketId } = data;

//             io.to(conversationId).emit('user-online', {
//               userId,
//               conversationId,
//               status: 'online',
//               timestamp: new Date().toISOString(),
//             });

//             console.log(`[PresenceConsumer] Broadcasted user online: ${userId}`);
//           } else if (type === 'user.offline') {
//             const { conversationId, userId } = data;

//             io.to(conversationId).emit('user-offline', {
//               userId,
//               conversationId,
//               status: 'offline',
//               timestamp: new Date().toISOString(),
//             });

//             console.log(`[PresenceConsumer] Broadcasted user offline: ${userId}`);
//           } else if (type === 'user.joined') {
//             const { conversationId, userId, userName } = data;

//             io.to(conversationId).emit('user-joined', {
//               userId,
//               conversationId,
//               userName,
//               status: 'joined',
//               timestamp: new Date().toISOString(),
//             });

//             console.log(`[PresenceConsumer] Broadcasted user joined: ${userId}`);
//           } else if (type === 'user.left') {
//             const { conversationId, userId, userName } = data;

//             io.to(conversationId).emit('user-left', {
//               userId,
//               conversationId,
//               userName,
//               status: 'left',
//               timestamp: new Date().toISOString(),
//             });

//             console.log(`[PresenceConsumer] Broadcasted user left: ${userId}`);
//           } else if (type === 'message.read') {
//             const { conversationId, messageIds, userId } = data;

//             io.to(conversationId).emit('message-read-notification', {
//               userId,
//               conversationId,
//               messageIds,
//               timestamp: new Date().toISOString(),
//             });

//             console.log(`[PresenceConsumer] Broadcasted message read notification`);
//           }

//           // Acknowledge message
//           channel.ack(msg);
//         } catch (error) {
//           console.error('[PresenceConsumer] Error processing message:', error);
//           // Reject and requeue
//           channel.nack(msg, false, true);
//         }
//       },
//       { noAck: false }
//     );

//     console.log('[PresenceConsumer] Presence consumer started successfully');
//   } catch (error) {
//     console.error('[PresenceConsumer] Failed to start presence consumer:', error);
//     throw error;
//   }
// }
