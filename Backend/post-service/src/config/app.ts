import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';

/**
 * Create Express application and setup middleware
 */
export function createApp(): Express {
  const app = express();

  // CORS is handled by API Gateway, so we do not need it here.
  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'POST-SERVICE',
      timestamp: new Date().toISOString(),
    });
  });

  // Service info endpoint
  app.get('/info', (req: Request, res: Response) => {
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
