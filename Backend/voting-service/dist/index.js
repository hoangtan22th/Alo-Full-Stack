"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./configs/db"));
const rabbitmq_1 = require("./configs/rabbitmq");
const pollWorker_1 = require("./workers/pollWorker");
const pollRoutes_1 = __importDefault(require("./routes/pollRoutes"));
dotenv_1.default.config();
(0, db_1.default)();
rabbitmq_1.rabbitMQService.connect();
(0, pollWorker_1.initPollWorker)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = process.env.PORT || 8086;
app.use('/api/v1/polls', pollRoutes_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', service: 'voting-service' });
});
app.listen(PORT, () => {
    console.log(`Voting Service is running on port ${PORT}`);
});
