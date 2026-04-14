import 'dotenv/config';

// Import configs
import { connectDB, disconnectDB } from './src/config/db';
import { connectRabbitMQ, closeRabbitMQ } from './src/config/rabbitmq';
import { createApp } from './src/config/app';
import eurekaClient from './src/config/eureka-client';

// Import routes
import messageRouter from './src/routes/message.routes';

// Import middleware
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler';

const PORT = parseInt(process.env.PORT || '8083', 10);

/**
 * Main application startup
 */
async function startApplication(): Promise<void> {
  try {
    console.log('========================================');
    console.log('[App] Starting MESSAGE-SERVICE');
    console.log('========================================');

    // 1. Connect to MongoDB
    console.log('[App] Connecting to MongoDB...');
    await connectDB();

    // 2. Connect to RabbitMQ
    console.log('[App] Connecting to RabbitMQ...');
    await connectRabbitMQ();

    // 3. Create Express app
    console.log('[App] Setting up Express...');
    const app = createApp();

    // 4. Register REST API routes
    console.log('[App] Registering routes...');
    
    // Debug middleware
    app.use((req, res, next) => {
      console.log(`[Incoming Request] ${req.method} ${req.url}`);
      next();
    });

    app.use('/api/v1/messages', messageRouter);

    // 5. Error handling middleware
    app.use(notFoundHandler);
    app.use(errorHandler);

    // 6. Register with Eureka
    console.log('[App] Registering with Eureka...');
    eurekaClient.start((error) => {
      if (error) {
        console.error('[App] Eureka registration error:', error);
      } else {
        console.log('[App] Registered with Eureka successfully');
      }
    });

    // 7. Start listening
    const server = app.listen(PORT, () => {
      console.log('========================================');
      console.log(`[App] MESSAGE-SERVICE running on port ${PORT}`);
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
      await disconnectDB();
      await closeRabbitMQ();

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