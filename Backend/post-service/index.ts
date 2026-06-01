import 'dotenv/config';

// Import configs
import { connectDB, disconnectDB } from './src/config/db';
import { createApp } from './src/config/app';
import eurekaClient from './src/config/eureka-client';
import { connectRabbitMQ, closeRabbitMQ } from './src/config/rabbitmq';

// Import routes
import postRouter from './src/routes/post.routes';
import storyRouter from './src/routes/story.routes';
import notificationRouter from './src/routes/notification.routes';

// Import middleware
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler';

const PORT = parseInt(process.env.PORT || '8089', 10);

/**
 * Main application startup
 */
async function startApplication(): Promise<void> {
  try {
    console.log('========================================');
    console.log('[App] Starting POST-SERVICE');
    console.log('========================================');

    // 1. Connect to MongoDB
    console.log('[App] Connecting to MongoDB...');
    await connectDB();

    // 1.1 Connect to RabbitMQ
    console.log('[App] Connecting to RabbitMQ...');
    await connectRabbitMQ();

    // 2. Create Express app
    console.log('[App] Setting up Express...');
    const app = createApp();

    // 3. Register REST API routes
    console.log('[App] Registering routes...');
    
    // Debug middleware
    app.use((req, res, next) => {
      console.log(`[Incoming Request] ${req.method} ${req.url}`);
      next();
    });

    app.use('/api/v1/posts', postRouter);
    app.use('/api/v1/stories', storyRouter);
    app.use('/api/v1/notifications', notificationRouter);

    // 4. Error handling middleware
    app.use(notFoundHandler);
    app.use(errorHandler);

    // 5. Register with Eureka
    console.log('[App] Registering with Eureka...');
    eurekaClient.start((error) => {
      if (error) {
        console.error('[App] Eureka registration error:', error);
      } else {
        console.log('[App] Registered with Eureka successfully');
      }
    });

    // 6. Start listening
    const server = app.listen(PORT, () => {
      console.log('========================================');
      console.log(`[App] POST-SERVICE running on port ${PORT}`);
      console.log(`[App] Health: http://localhost:${PORT}/health`);
      console.log('========================================');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => shutdownApplication(server, 'SIGTERM'));
    process.on('SIGINT', () => shutdownApplication(server, 'SIGINT'));
  } catch (error) {
    console.error('[App] Failed to start application:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdownApplication(server: any, signal: string): Promise<void> {
  console.warn(`[App] Received ${signal}, shutting down gracefully...`);

  server.close(async () => {
    try {
      eurekaClient.stop();
      await closeRabbitMQ();
      await disconnectDB();

      console.log('[App] Application shut down gracefully');
      process.exit(0);
    } catch (error) {
      console.error('[App] Error during shutdown:', error);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('[App] Forcing shutdown');
    process.exit(1);
  }, 10000);
}

startApplication().catch((error) => {
  console.error('[App] Fatal error:', error);
  process.exit(1);
});
