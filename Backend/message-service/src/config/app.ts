import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';

/**
 * Create Express application and setup middleware
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  // app.use(cors()); // Tắt CORS ở đây vì Gateway đã xử lý
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'MESSAGE-SERVICE',
      timestamp: new Date().toISOString(),
    });
  });

  // Service info endpoint
  app.get('/info', (req: Request, res: Response) => {
    res.status(200).json({
      name: 'MESSAGE-SERVICE',
      version: '1.0.0',
      description: 'Real-time Messaging Service',
      status: 'running',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
