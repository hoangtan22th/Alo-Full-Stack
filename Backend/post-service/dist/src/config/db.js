"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.disconnectDB = disconnectDB;
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Connect to MongoDB
 */
async function connectDB() {
    try {
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alo_post_db';
        await mongoose_1.default.connect(mongoUri);
        console.log('[MongoDB] Connected successfully');
        // Handle connection events
        mongoose_1.default.connection.on('error', (err) => {
            console.error('[MongoDB] Connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('[MongoDB] Disconnected');
        });
    }
    catch (error) {
        console.error('[MongoDB] Connection failed:', error);
        throw error;
    }
}
/**
 * Disconnect from MongoDB
 */
async function disconnectDB() {
    try {
        await mongoose_1.default.disconnect();
        console.log('[MongoDB] Disconnected gracefully');
    }
    catch (error) {
        console.error('[MongoDB] Error disconnecting:', error);
    }
}
exports.default = mongoose_1.default;
//# sourceMappingURL=db.js.map