import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import masterDataRoutes from './routes/masterData.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import purchasingRoutes from './routes/purchasing.routes.js';
import fulfillmentRoutes from './routes/fulfillment.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ENV } from './config/env.js';

export const createApp = (): Application => {
  const app = express();

  // Security headers & CORS
  app.use(helmet());
  app.use(
    cors({
      origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true
    })
  );

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root welcome
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: 'Warehouse Management System (WMS) API Gateway',
      docs: '/api/health',
      version: '1.0.0'
    });
  });

  // API Routes
  app.use('/api', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1', masterDataRoutes);
  app.use('/api/v1', purchasingRoutes);
  app.use('/api/v1', fulfillmentRoutes);
  app.use('/api/v1', analyticsRoutes);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested API route was not found on this server'
      }
    });
  });

  // Global error handler
  app.use(errorHandler);

  return app;
};
