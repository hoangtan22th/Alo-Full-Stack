"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
/**
 * Create Express application and setup middleware
 */
function createApp() {
    const app = (0, express_1.default)();
    // CORS is handled by API Gateway, so we do not need it here.
    // Middleware
    app.use(express_1.default.json({ limit: '50mb' }));
    app.use(express_1.default.urlencoded({ limit: '50mb', extended: true }));
    // Request logging middleware
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'UP',
            service: 'POST-SERVICE',
            timestamp: new Date().toISOString(),
        });
    });
    // Service info endpoint
    app.get('/info', (req, res) => {
        res.status(200).json({
            name: 'POST-SERVICE',
            version: '1.0.0',
            description: 'Post and Profile Feed Service',
            status: 'running',
            timestamp: new Date().toISOString(),
        });
    });
    return app;
}
//# sourceMappingURL=app.js.map