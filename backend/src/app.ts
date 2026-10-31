import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import { csrfProtection } from './middleware/csrf';
import apiRouter from './routes';
import swaggerSpec from './docs/swagger.json';
import { NotFoundError } from './utils/errors';
import { Send } from './utils/apiResponse';

export function createApp(): express.Application {
  const app = express();

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI and printable SVG labels to render cleanly
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  // 2. Explicit CORS configuration
  const allowedOrigins = [
    env.CLIENT_URL,
    env.FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000'
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (such as mobile apps, Postman, curl, or server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Dev-friendly permissive callback with origin reflection
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-csrf-token',
        'X-Requested-With',
        'idempotency-key'
      ]
    })
  );

  // 3. Body Parsing & Cookie Middleware
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Request Logging
  app.use(requestLogger);

  // 5. Global Rate Limiter
  app.use('/api/', generalLimiter);

  // 6. CSRF Protection
  app.use('/api/', csrfProtection);

  // 7. Health Check
  app.get(['/health', '/api/v1/health'], (_req: Request, res: Response) => {
    Send.success(res, {
      status: 'UP',
      supermarket: 'Single Supermarket Management System',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  });

  // 8. Swagger API Documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs/swagger.json', (_req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  // 9. API Business Routes (Scoped to /api/v1)
  app.use('/api/v1', apiRouter);

  // 10. 404 Route Handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found on this server.`));
  });

  // 11. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
