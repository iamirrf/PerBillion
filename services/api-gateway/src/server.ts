import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import forecastRoutes from './routes/forecast';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import educationRoutes from './routes/education';
import productRoutes from './routes/product';
import billingRoutes, { stripeWebhook } from './routes/billing';
import challengeRoutes from './routes/challenges';
import logger from './utils/logger';
import { GridFSBucket } from 'mongodb';
import { getDb } from './utils/db';

const app = express();
const PORT = process.env.PORT || 3000;

// Behind nginx in Docker; required for correct client IP handling
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Compression and parsing
app.use(compression());
// Stripe signs the exact request bytes. This endpoint must be mounted before
// JSON parsing and uses its own signature verification instead of browser CSRF.
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json', limit: '1mb' }), stripeWebhook);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cloud Run storage is ephemeral; production profile images live in MongoDB.
if (process.env.PERSIST_UPLOADS_IN_MONGO === 'true') {
  app.get('/uploads/profiles/:filename', async (req, res) => {
    const filename = req.params.filename;
    if (!/^[a-f0-9-]{36}-\d+-[a-f0-9-]{36}\.(jpe?g|png|gif|webp)$/.test(filename)) {
      return res.sendStatus(404);
    }
    try {
      const database = await getDb();
      const bucket = new GridFSBucket(database, { bucketName: 'profile_images' });
      const files = await bucket.find({ filename }).limit(1).toArray();
      if (!files.length) return res.sendStatus(404);
      res.type(files[0].metadata?.contentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      bucket.openDownloadStream(files[0]._id).on('error', (error) => {
        logger.error('Profile image retrieval error:', error);
        if (!res.headersSent) res.sendStatus(500);
        else res.destroy(error);
      }).pipe(res);
    } catch (error) {
      logger.error('Profile image retrieval error:', error);
      if (!res.headersSent) res.sendStatus(500);
    }
  });
}

// Serve local uploads in development.
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Rate limiting
app.use('/api/', rateLimiter);

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/education', educationRoutes);
app.use('/api/product', productRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/challenges', challengeRoutes);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 PerBillion API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
