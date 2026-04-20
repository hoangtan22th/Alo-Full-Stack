import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import connectDB from './configs/db';
import { rabbitMQService } from './configs/rabbitmq';
import { eurekaClient } from './configs/eureka';
import { initPollWorker } from './workers/pollWorker';
import pollRoutes from './routes/pollRoutes';

dotenv.config();

connectDB();
rabbitMQService.connect();
initPollWorker();

eurekaClient.start((error: any) => {
  if (error) {
    console.error("❌ Error starting Eureka Client", error);
  } else {
    console.log("✅ Registered with Eureka Discovery Service as VOTING-SERVICE");
  }
});

const app = express();
app.use(cors());
app.use(express.json());

// Debug logging for incoming requests
app.use((req, res, next) => {
  console.log(`[VotingService] Incoming: ${req.method} ${req.url}`);
  next();
});

const PORT = process.env.PORT || 8087;

app.use('/api/v1/polls', pollRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'voting-service' });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("🔥 GLOBAL ERROR CAUGHT:");
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);
  res.status(500).json({ status: 'error', message: err.message, stack: err.stack });
});

app.listen(PORT, () => {
  console.log(`Voting Service is running on port ${PORT}`);
});
