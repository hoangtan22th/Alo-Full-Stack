import 'dotenv/config';
import http from 'http';

// Import configs
import { connectDB, disconnectDB } from './src/config/db';
import { connectRabbitMQ, closeRabbitMQ } from './src/config/rabbitmq';
import { createApp } from './src/config/app';
import { initializeSocket, setupNamespaces } from './src/config/socket';
import eurekaClient from './src/config/eureka-client';

// Import routes
import messageRouter from './src/routes/message.routes';


// Import handlers
import { setupMessageGateway, setupPresenceGateway } from './src/handlers/gateway';

// Import workers
import { startAllWorkers } from './src/workers/startWorkers';

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

    // 4. Create HTTP server
    const httpServer = http.createServer(app);

    // 5. Initialize Socket.io
    console.log('[App] Initializing Socket.io...');
    const io = initializeSocket(httpServer);
    setupNamespaces(io);

    // 6. Setup Socket.io gateways
    console.log('[App] Setting up Socket.io gateways...');
    setupMessageGateway(io);
    setupPresenceGateway(io);


    // in mọi url đang gọi tới để kiểm tra
    app.use((req, res, next) => {
    console.log(`[Incoming Request] ${req.method} ${req.url}`);
    console.log(`[Full URL] http://localhost:${PORT}${req.url}`);
    next();
});
    // 7. Register REST API routes
    console.log('[App] Registering routes...');
    app.use('/', messageRouter);

    // 8. Error handling middleware
    app.use(notFoundHandler);
    app.use(errorHandler);

    // 9. Start RabbitMQ consumers/workers
    console.log('[App] Starting RabbitMQ workers...');
    await startAllWorkers();

    // 10. Register with Eureka
    console.log('[App] Registering with Eureka...');
    eurekaClient.start((error) => {
      if (error) {
        console.error('[App] Eureka registration error:', error);
      } else {
        console.log('[App] Registered with Eureka successfully');
      }
    });

    // 11. Start listening
    httpServer.listen(PORT, () => {
      console.log('========================================');
      console.log(`[App] MESSAGE-SERVICE running on port ${PORT}`);
      console.log(`[App] WebSocket: ws://localhost:${PORT}`);
      console.log(`[App] Health: http://localhost:${PORT}/health`);
      console.log('========================================');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => shutdownApplication(httpServer, 'SIGTERM'));
    process.on('SIGINT', () => shutdownApplication(httpServer, 'SIGINT'));
  } catch (error) {
    console.error('[App] Failed to start application:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdownApplication(httpServer: any, signal: string): Promise<void> {
  console.warn(`[App] Received ${signal}, shutting down gracefully...`);

  httpServer.close(async () => {
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