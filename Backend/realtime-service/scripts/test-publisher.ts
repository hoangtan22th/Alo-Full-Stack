import amqp from "amqplib";
import dotenv from "dotenv";
dotenv.config();

async function simulatePublish() {
  try {
    const payload = {
      event: "NEW_MESSAGE",
      target: "123", // target user_id
      data: {
        messageId: 999,
        content: "Hello from Java/NodeJS Publisher!",
        senderId: "456",
        timestamp: Date.now(),
      },
    };

    const connection = await amqp.connect(
      process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    );
    const channel = await connection.createChannel();
    const queue = "realtime_events";

    await channel.assertQueue(queue, { durable: true });

    // Gửi sự kiện vào hàng đợi
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), {
      persistent: true,
    });

    console.log(`[x] Đã gửi message tới queue '${queue}':`, payload);

    setTimeout(() => {
      connection.close();
      process.exit(0);
    }, 500);
  } catch (error) {
    console.error(error);
  }
}

simulatePublish();
