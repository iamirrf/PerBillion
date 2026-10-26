import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';
import { authenticateToken } from '../middleware/auth';
import { getDb } from '../utils/db';
import { randomUUID } from 'crypto';

const router = Router();
router.use(authenticateToken);
const SPRING_ORCHESTRATOR_URL = process.env.SPRING_ORCHESTRATOR_URL || 'http://spring-orchestrator:8080';
const configuredDailyLimit = Number(process.env.FORECAST_DAILY_LIMIT || 25);
const dailyLimit = Number.isInteger(configuredDailyLimit) && configuredDailyLimit > 0 ? configuredDailyLimit : 25;

// Rate limiter for forecast generation (more restrictive)
const forecastRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: { message: 'Too many forecast requests. Please wait a moment before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const forecastWindowMs = 24 * 60 * 60 * 1000;
async function consumeForecastCapacity() {
  const collection = (await getDb()).collection<any>('forecast_capacity');
  const now = new Date(), resetAt = new Date(now.getTime() + forecastWindowMs);
  await collection.updateOne({ _id: 'global' }, { $setOnInsert: { used: 0, resetAt, createdAt: now } }, { upsert: true });
  const row: any = await collection.findOneAndUpdate(
    { _id: 'global', $or: [{ resetAt: { $lte: now } }, { used: { $lt: dailyLimit } }] },
    [{ $set: {
      used: { $cond: [{ $lte: ['$resetAt', now] }, 1, { $add: [{ $ifNull: ['$used', 0] }, 1] }] },
      resetAt: { $cond: [{ $lte: ['$resetAt', now] }, resetAt, '$resetAt'] },
      updatedAt: now,
    } }],
    { returnDocument: 'after' },
  );
  return row ? { allowed: true, used: Number(row.used || 1), remaining: Math.max(0, dailyLimit - Number(row.used || 1)), resetAt: row.resetAt || resetAt } : { allowed: false, used: dailyLimit, remaining: 0, resetAt };
}

async function requireCapacity(res: Response) {
  try {
    const capacity = await consumeForecastCapacity();
    res.setHeader('X-Forecast-Limit', String(dailyLimit));
    res.setHeader('X-Forecast-Remaining', String(capacity.remaining));
    if (!capacity.allowed) {
      res.status(429).json({ message: 'Today’s forecast capacity has been reached. Lessons and simulations remain available.', capacity });
      return null;
    }
    return capacity;
  } catch (error) {
    logger.error('Forecast capacity check failed:', error);
    res.status(503).json({ message: 'Forecast capacity is temporarily unavailable' });
    return null;
  }
}
function validateForecastRequest(req: Request, res: Response, next: NextFunction) {
  const { ticker, forecastMonths = 12, modelType = 'auto', advanced_config } = req.body || {};
  if (typeof ticker !== 'string' || !/^[A-Za-z]{1,5}$/.test(ticker)) {
    return res.status(400).json({ message: 'Enter a stock ticker with 1–5 letters' });
  }
  if (!Number.isInteger(forecastMonths) || forecastMonths < 1 || forecastMonths > 52) {
    return res.status(400).json({ message: 'Forecast horizon must be an integer from 1 to 52 weeks' });
  }
  if (!['auto', 'ARIMA', 'SARIMA', 'SARIMAX', 'HOLT_WINTERS_ADDITIVE', 'HOLT_WINTERS_MULTIPLICATIVE', 'HOLT_WINTERS_DAMPED'].includes(modelType)) {
    return res.status(400).json({ message: 'Choose a supported forecast model' });
  }
  if (advanced_config !== undefined && (advanced_config === null || typeof advanced_config !== 'object' || Array.isArray(advanced_config))) {
    return res.status(400).json({ message: 'Advanced configuration must be an object' });
  }
  next();
}

// Generate forecast for a stock ticker
router.post('/generate', forecastRateLimiter, validateForecastRequest, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const suppliedRequestId = req.headers['idempotency-key'] || req.body?.requestId;
  const requestId = typeof suppliedRequestId === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(suppliedRequestId)
    ? suppliedRequestId
    : randomUUID();
  let requestRecorded = false;
  try {
    const { ticker, forecastMonths = 12, modelType = 'auto', advanced_config } = req.body;

    // Get userId from authenticated request
    const user = await (await getDb()).collection<any>('users').findOne({ _id: userId }, { projection: { emailVerified: 1 } });
    if (user?.emailVerified === false) return res.status(403).json({ message: 'Verify your email before generating a new live forecast.' });
    const requests = (await getDb()).collection<any>('forecast_requests');
    await requests.createIndex({ userId: 1, requestId: 1 }, { unique: true });
    try {
      await requests.insertOne({ userId, requestId, state: 'pending', ticker: ticker.toUpperCase(), forecastHorizon: forecastMonths, createdAt: new Date(), updatedAt: new Date() });
      requestRecorded = true;
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      const existing = await requests.findOne({ userId, requestId });
      if (existing?.state === 'complete') return res.json(existing.response);
      return res.status(409).json({ code: 'FORECAST_IN_PROGRESS', message: 'This forecast request is already being processed.', requestId });
    }
    if (!await requireCapacity(res)) {
      await requests.updateOne({ userId, requestId }, { $set: { state: 'rejected', updatedAt: new Date() } });
      return;
    }

    // forecastMonths is retained for existing clients; the source series and
    // forecast periods are weekly.
    logger.info(`Generating forecast for ${ticker} with ${forecastMonths} weeks (user: ${userId})`);

    // Call Spring orchestrator to generate forecast
    const payload: any = {
      userId: userId,
      ticker: ticker.toUpperCase(),
      forecastHorizon: forecastMonths,
      modelType,
      requestId,
    };

    // Add advanced config if provided
    if (advanced_config) {
      payload.advancedConfig = advanced_config;
    }

    const response = await axios.post(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/generate`, payload, {
      timeout: 120000 // 2 minute timeout for ML processing
    });

    const responseBody = { ...response.data, requestId };
    await requests.updateOne({ userId, requestId }, { $set: { state: 'complete', response: responseBody, completedAt: new Date(), updatedAt: new Date() } });
    res.json(responseBody);
  } catch (error: any) {
    if (requestRecorded) {
      await (await getDb()).collection('forecast_requests').updateOne(
        { userId, requestId },
        { $set: { state: 'failed', failedAt: new Date(), updatedAt: new Date(), errorCode: error.response?.status || 'SERVICE_UNAVAILABLE' } },
      ).catch(() => undefined);
    }
    logger.error('Forecast generation error:', error.message);
    logger.error('Error details:', error.response?.data || error);
    
    if (error.response) {
      logger.error(`Spring orchestrator returned ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      return res.status(error.response.status).json({
        message: error.response.data.message || 'Failed to generate forecast',
        details: error.response.data
      });
    }

    res.status(503).json({ message: 'The forecast service is unavailable. Please try again shortly.' });
  }
});

// Get historical forecasts from MongoDB
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { ticker, limit = 10 } = req.query;
    if (ticker !== undefined && (typeof ticker !== 'string' || !/^[A-Za-z]{1,5}$/.test(ticker))) {
      return res.status(400).json({ message: 'Enter a valid ticker' });
    }
    const pageSize = Number(limit);
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return res.status(400).json({ message: 'Limit must be an integer from 1 to 100' });
    }
    const userId = (req as any).user.id;

    // If no ticker provided, get all user forecasts
    if (!ticker) {
      try {
        const response = await axios.get(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/user/${userId}`, {
          params: { page: 0, size: pageSize }, timeout: 10000
        });
        return res.json(response.data);
      } catch (err: any) {
        // If user endpoint doesn't exist, return empty array
        if (err.response?.status === 404) {
          return res.json({ forecasts: [], total: 0 });
        }
        throw err;
      }
    }

    // Get forecasts for specific ticker
    if (ticker) {
      const response = await axios.get(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/user/${userId}`, {
        params: { page: 0, size: pageSize, ticker: ticker.toUpperCase() }, timeout: 10000
      });
      return res.json(response.data);
    }

    res.json({ forecasts: [], total: 0 });
  } catch (error: any) {
    logger.error('Forecast history retrieval error:', error.message);
    res.status(503).json({ message: 'Forecast history is temporarily unavailable' });
  }
});

// Re-run a saved input snapshot with another model. This consumes normal forecast capacity.
router.post('/:forecastId/rerun', forecastRateLimiter, async (req: Request, res: Response) => {
  try {
    const forecastId = typeof req.params.forecastId === 'string' ? req.params.forecastId : '';
    const { modelType = 'auto' } = req.body || {};
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(forecastId) || !['auto', 'ARIMA', 'SARIMA', 'SARIMAX', 'HOLT_WINTERS_ADDITIVE', 'HOLT_WINTERS_MULTIPLICATIVE', 'HOLT_WINTERS_DAMPED'].includes(modelType)) return res.status(400).json({ message: 'Choose a valid saved forecast and model' });
    const prior = await axios.get(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/${forecastId}`, { timeout: 10000 });
    if (prior.data?.userId !== (req as any).user.id) return res.status(404).json({ message: 'Forecast not found' });
    const user = await (await getDb()).collection<any>('users').findOne({ _id: (req as any).user.id }, { projection: { emailVerified: 1 } });
    if (user?.emailVerified === false) return res.status(403).json({ message: 'Verify your email before generating a new live forecast.' });
    const data = prior.data?.historicalData?.series;
    const forecastHorizon = prior.data?.requestMetadata?.forecastHorizon;
    if (!Array.isArray(data) || !Number.isInteger(forecastHorizon)) return res.status(409).json({ message: 'This legacy run has no reusable source snapshot' });
    if (!await requireCapacity(res)) return;
    const response = await axios.post(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts`, { userId: (req as any).user.id, ticker: prior.data.ticker, data, forecastHorizon, modelType }, { timeout: 120000 });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response?.status === 404) return res.status(404).json({ message: 'Forecast not found' });
    logger.error('Forecast snapshot rerun failed:', error.message);
    res.status(error.response?.status || 503).json({ message: error.response?.data?.message || 'The saved snapshot could not be rerun' });
  }
});

router.get('/capacity', async (_req: Request, res: Response) => {
  try {
    const row: any = await (await getDb()).collection<any>('forecast_capacity').findOne({ _id: 'global' });
    const now = Date.now(), reset = row?.resetAt ? new Date(row.resetAt) : new Date(now + forecastWindowMs);
    const expired = reset.getTime() <= now;
    const used = expired ? 0 : Number(row?.used || 0);
    return res.json({ limit: dailyLimit, used, remaining: Math.max(0, dailyLimit - used), resetAt: expired ? new Date(now + forecastWindowMs) : reset });
  } catch (error) {
    logger.error('Forecast capacity read failed:', error);
    return res.status(503).json({ message: 'Forecast capacity is temporarily unavailable' });
  }
});

// Get specific forecast by ID
router.get('/:forecastId', async (req: Request, res: Response) => {
  try {
    const forecastId = typeof req.params.forecastId === 'string' ? req.params.forecastId : '';

    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(forecastId)) return res.status(400).json({ message: 'Invalid forecast ID' });
    const response = await axios.get(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/${forecastId}`, { timeout: 10000 });
    if (response.data?.userId !== (req as any).user.id) return res.status(404).json({ message: 'Forecast not found' });
    res.json(response.data);
  } catch (error: any) {
    logger.error('Forecast retrieval error:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ message: 'Forecast not found' });
    }

    res.status(500).json({ message: 'Failed to retrieve forecast' });
  }
});

export default router;
