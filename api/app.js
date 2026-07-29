import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { config } from './config.js';
import { asyncRoute, errorHandler, notFoundHandler } from './middleware.js';
import routes from './routes.js';
import recommendationRoutes, { savePreferences } from './recommendation-routes.js';
import authRoutes from './auth-routes.js';
import userRoutes from './user-routes.js';

const corsOptions = {
  origin(origin, callback) {
    if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-User-ID'],
  credentials: true,
  maxAge: 86_400,
  optionsSuccessStatus: 204,
};

export function configureApp(app) {
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(compression());
  app.options(/.*/, cors(corsOptions));
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      console.log(
        JSON.stringify({
          level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
          event: 'http_request',
          method: req.method,
          path: req.originalUrl.split('?')[0],
          status: res.statusCode,
          duration_ms: Number(durationMs.toFixed(2)),
          timestamp: new Date().toISOString(),
        })
      );
    });
    next();
  });
  app.use(cors(corsOptions));
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      limit: config.rateLimitMax,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      },
    })
  );
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({ success: true, total: 1, page: 1, pages: 1, data: [{ status: 'ok' }] });
  });
  app.post('/api/preferences', asyncRoute(savePreferences));
  app.use('/api/auth', authRoutes);
  app.use('/api', userRoutes);
  app.use('/api/recommendations', recommendationRoutes);
  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export function createApp() {
  return configureApp(express());
}

const app = createApp();

export default app;
