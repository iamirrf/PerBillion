import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';
import { authenticateToken } from '../middleware/auth';

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
// One deployment-wide budget protects the shared market-data and model services.
// For multi-instance hosting replace the in-memory store with a shared store.
const forecastDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: dailyLimit,
  keyGenerator: () => 'forecast-budget',
  message: { message: 'Today’s forecast capacity has been reached. Lessons and simulations remain available.' },
  standardHeaders: true,
  legacyHeaders: false,
});
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
router.post('/generate', forecastRateLimiter, validateForecastRequest, forecastDailyLimiter, async (req: Request, res: Response) => {
  try {
    const { ticker, forecastMonths = 12, modelType = 'auto', advanced_config } = req.body;

    // Get userId from authenticated request
    const userId = (req as any).user.id;

    // forecastMonths is retained for existing clients; the source series and
    // forecast periods are weekly.
    logger.info(`Generating forecast for ${ticker} with ${forecastMonths} weeks (user: ${userId})`);

    // Call Spring orchestrator to generate forecast
    const payload: any = {
      userId: userId,
      ticker: ticker.toUpperCase(),
      forecastHorizon: forecastMonths,
      modelType
    };

    // Add advanced config if provided
    if (advanced_config) {
      payload.advancedConfig = advanced_config;
    }

    const response = await axios.post(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/generate`, payload, {
      timeout: 120000 // 2 minute timeout for ML processing
    });

    res.json(response.data);
  } catch (error: any) {
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
router.post('/:forecastId/rerun', forecastRateLimiter, forecastDailyLimiter, async (req: Request, res: Response) => {
  try {
    const { forecastId } = req.params;
    const { modelType = 'auto' } = req.body || {};
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(forecastId) || !['auto', 'ARIMA', 'SARIMA', 'SARIMAX', 'HOLT_WINTERS_ADDITIVE', 'HOLT_WINTERS_MULTIPLICATIVE', 'HOLT_WINTERS_DAMPED'].includes(modelType)) return res.status(400).json({ message: 'Choose a valid saved forecast and model' });
    const prior = await axios.get(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/${forecastId}`, { timeout: 10000 });
    if (prior.data?.userId !== (req as any).user.id) return res.status(404).json({ message: 'Forecast not found' });
    const data = prior.data?.historicalData?.series;
    const forecastHorizon = prior.data?.requestMetadata?.forecastHorizon;
    if (!Array.isArray(data) || !Number.isInteger(forecastHorizon)) return res.status(409).json({ message: 'This legacy run has no reusable source snapshot' });
    const response = await axios.post(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts`, { userId: (req as any).user.id, ticker: prior.data.ticker, data, forecastHorizon, modelType }, { timeout: 120000 });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    if (error.response?.status === 404) return res.status(404).json({ message: 'Forecast not found' });
    logger.error('Forecast snapshot rerun failed:', error.message);
    res.status(error.response?.status || 503).json({ message: error.response?.data?.message || 'The saved snapshot could not be rerun' });
  }
});

// Get specific forecast by ID
router.get('/:forecastId', async (req: Request, res: Response) => {
  try {
    const { forecastId } = req.params;

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
