import http from 'http';
import { createApp } from './app';
import { connectDB, disconnectDB } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { initSocketIO } from './sockets/socket';
import { ExpirationAndStockJob } from './jobs/expirationChecker';

async function bootstrap() {
  try {
    // 1. Connect to Database
    logger.info('Initializing Single Supermarket Management System backend...');
    await connectDB();

    // 2. Initialize Express application
    const app = createApp();
    const server = http.createServer(app);

    // 3. Initialize Authenticated Socket.IO Server
    initSocketIO(server, env.CLIENT_URL);
    logger.info('✅ Socket.IO real-time server attached.');

    // 4. Start background expiration check job
    ExpirationAndStockJob.startCron();
    logger.info('✅ Scheduled background expiration & low-stock check job initiated.');

    // 5. Start HTTP server
    server.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT} in [${env.NODE_ENV}] mode`);
      logger.info(`📖 Swagger API Documentation available at: http://localhost:${env.PORT}/api/docs`);
      logger.info(`🏥 Health check endpoint: http://localhost:${env.PORT}/health`);
    });

    // 6. Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDB();
        process.exit(0);
      });

      // Force shutdown after 10 seconds timeout
      setTimeout(() => {
        logger.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error: any) {
    const message = `Fatal startup error: ${error.message}`;
    logger.error(message, { stack: error.stack });
    // Keep startup failures visible even if a logging transport is misconfigured.
    console.error(message, error.stack);
    process.exit(1);
  }
}

bootstrap();
