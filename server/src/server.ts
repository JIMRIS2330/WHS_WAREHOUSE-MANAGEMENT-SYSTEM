import { createApp } from './app.js';
import { ENV } from './config/env.js';

const app = createApp();

const server = app.listen(ENV.PORT, () => {
  console.log(`=======================================================`);
  console.log(` Warehouse Management System (WMS) API Server Started `);
  console.log(` Port:        http://localhost:${ENV.PORT}`);
  console.log(` HealthCheck: http://localhost:${ENV.PORT}/api/health`);
  console.log(` Environment: ${ENV.NODE_ENV}`);
  console.log(` Client URL:  ${ENV.CLIENT_URL}`);
  console.log(`=======================================================`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
