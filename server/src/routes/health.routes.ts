import { Router, Request, Response } from 'express';
import { ENV } from '../config/env.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      service: 'Warehouse Management System API',
      version: '1.0.0',
      environment: ENV.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      system: {
        nodeVersion: process.version,
        memoryRssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        memoryHeapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100
      }
    }
  });
});

export default router;
