import { Router, Request, Response } from 'express';
import axios from 'axios';
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

const router = Router();
const SPRING_ORCHESTRATOR_URL = process.env.SPRING_ORCHESTRATOR_URL || 'http://spring-orchestrator:8080';

// Rate limiter for forecast generation (more restrictive)
const forecastRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Too many forecast requests. Please wait a moment before trying again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate forecast for a stock ticker
router.post('/generate', forecastRateLimiter, async (req: Request, res: Response) => {
  try {
    const { ticker, forecastMonths, modelType, advanced_config, manual_params } = req.body;

    if (!ticker) {
      return res.status(400).json({ message: 'Stock ticker is required' });
    }

    // Get userId from authenticated request
    const userId = (req as any).user?.id || 'anonymous';

    logger.info(`Generating forecast for ${ticker} with ${forecastMonths || 12} periods (user: ${userId})`);

    // Call Spring orchestrator to generate forecast
    const payload: any = {
      userId: userId,
      ticker: ticker.toUpperCase(),
      forecastHorizon: forecastMonths || 12,
      modelType: modelType || 'auto'
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

    res.status(500).json({ message: 'Internal server error during forecast generation' });
  }
});

// Get historical forecasts from MongoDB
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { ticker, limit = 10 } = req.query;
    const userId = (req as any).user?.id;

    // If no ticker provided, get all user forecasts
    if (!ticker && userId) {
      try {
        const response = await axios.get(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/user/${userId}`, {
          params: { page: 0, size: limit }
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
      const response = await axios.get(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/ticker/${ticker}`, {
        params: { page: 0, size: limit }
      });
      return res.json(response.data);
    }

    // No ticker and no user - return empty
    res.json({ forecasts: [], total: 0 });
  } catch (error: any) {
    logger.error('Forecast history retrieval error:', error.message);
    // Return empty array instead of error to prevent UI crashes
    res.json({ forecasts: [], total: 0 });
  }
});

// Get specific forecast by ID
router.get('/:forecastId', async (req: Request, res: Response) => {
  try {
    const { forecastId } = req.params;

    const response = await axios.get(`${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/${forecastId}`);

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
