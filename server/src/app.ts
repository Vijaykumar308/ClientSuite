import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { apiRouter } from './routes';
import { notFoundHandler } from './middlewares/notFoundHandler';
import { errorHandler } from './middlewares/errorHandler';

export const createApp = (): Application => {
  const app = express();

  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: { mediaSrc: ["'self'", 'blob:'] },
    },
  }));

  // CORS Configuration
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    })
  );

  // Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(    morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      skip: (req) => req.path.startsWith('/api/client-portal/'),
    }));
  }

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Modular Routes
  app.use('/api', apiRouter);

  // Fallback & Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
