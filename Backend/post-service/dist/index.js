"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
// Import configs
const db_1 = require("./src/config/db");
const app_1 = require("./src/config/app");
const eureka_client_1 = __importDefault(require("./src/config/eureka-client"));
const rabbitmq_1 = require("./src/config/rabbitmq");
// Import routes
const post_routes_1 = __importDefault(require("./src/routes/post.routes"));
const story_routes_1 = __importDefault(require("./src/routes/story.routes"));
const notification_routes_1 = __importDefault(require("./src/routes/notification.routes"));
// Import middleware
const errorHandler_1 = require("./src/middleware/errorHandler");
const PORT = parseInt(process.env.PORT || '8087', 10);
/**
 * Main application startup
 */
async function startApplication() {
    try {
        console.log('========================================');
        console.log('[App] Starting POST-SERVICE');
        console.log('========================================');
        // 1. Connect to MongoDB
        console.log('[App] Connecting to MongoDB...');
        await (0, db_1.connectDB)();
        // 1.1 Connect to RabbitMQ
        console.log('[App] Connecting to RabbitMQ...');
        await (0, rabbitmq_1.connectRabbitMQ)();
        // 2. Create Express app
        console.log('[App] Setting up Express...');
        const app = (0, app_1.createApp)();
        // 3. Register REST API routes
        console.log('[App] Registering routes...');
        // Debug middleware
        app.use((req, res, next) => {
            console.log(`[Incoming Request] ${req.method} ${req.url}`);
            next();
        });
        app.use('/api/v1/posts', post_routes_1.default);
        app.use('/api/v1/stories', story_routes_1.default);
        app.use('/api/v1/notifications', notification_routes_1.default);
        // 4. Error handling middleware
        app.use(errorHandler_1.notFoundHandler);
        app.use(errorHandler_1.errorHandler);
        // 5. Register with Eureka
        console.log('[App] Registering with Eureka...');
        eureka_client_1.default.start((error) => {
            if (error) {
                console.error('[App] Eureka registration error:', error);
            }
            else {
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
    }
    catch (error) {
        console.error('[App] Failed to start application:', error);
        process.exit(1);
    }
}
/**
 * Graceful shutdown
 */
async function shutdownApplication(server, signal) {
    console.warn(`[App] Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
        try {
            eureka_client_1.default.stop();
            await (0, rabbitmq_1.closeRabbitMQ)();
            await (0, db_1.disconnectDB)();
            console.log('[App] Application shut down gracefully');
            process.exit(0);
        }
        catch (error) {
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
//# sourceMappingURL=index.js.map