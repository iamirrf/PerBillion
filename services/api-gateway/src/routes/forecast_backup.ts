import { Router, Request, Response } from 'express';
import axios from 'axios';
import logger from '../utils/logger';

const router = Router();
const SPRING_ORCHESTRATOR_URL = process.env.SPRING_ORCHESTRATOR_URL || 'http://spring-orchestrator:8080';

// Generate forecast for a stock ticker
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { ticker, forecastMonths, models, parameters } = req.body;

    if (!ticker) {
      return res.status(400).json({ message: 'Stock ticker is required' });
    }

    logger.info(`Generating forecast for ${ticker} with ${forecastMonths || 12} periods`);

    // Call Spring orchestrator to generate forecast
    const response = await axios.post(`${SPRING_ORCHESTRATOR_URL}/api/forecasts/generate`, {
      ticker: ticker.toUpperCase(),
      periods: forecastMonths || 12,
      models: models || ['arima', 'sarima', 'sarimax', 'holt-winters'],
      parameters: parameters || {}
    }, {
      timeout: 120000 // 2 minute timeout for ML processing
    });

    res.json(response.data);
  } catch (error: any) {
    logger.error('Forecast generation error:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        message: error.response.data.message || 'Failed to generate forecast'
      });
    }

    res.status(500).json({ message: 'Internal server error during forecast generation' });
  }
});

// Get historical forecasts from MongoDB
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { ticker, limit = 10 } = req.query;

    const response = await axios.get(`${SPRING_ORCHESTRATOR_URL}/api/forecasts/history`, {
      params: { ticker, limit }
    });

    res.json(response.data);
  } catch (error: any) {
    logger.error('Forecast history retrieval error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve forecast history' });
  }
});

// Get specific forecast by ID
router.get('/:forecastId', async (req: Request, res: Response) => {
  try {
    const { forecastId } = req.params;

    const response = await axios.get(`${SPRING_ORCHESTRATOR_URL}/api/forecasts/${forecastId}`);

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

    // First verify ownership
    const forecastResponse = await axios.get(
      `${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/${forecastId}`
    );

    if (forecastResponse.data.userId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete
    await axios.delete(
      `${SPRING_ORCHESTRATOR_URL}/api/v1/forecasts/${forecastId}`
    );

    logger.info(`Forecast deleted: ${forecastId}`);

    res.status(204).send();
  } catch (error: any) {
    logger.error('Forecast deletion error:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Forecast deletion failed'
    });
  }
});

export default router;
