import { Router, Request, Response } from 'express';
import axios from 'axios';
import { mongoPing } from '../utils/db';

const router = Router();

const SPRING_ORCHESTRATOR_URL = process.env.SPRING_ORCHESTRATOR_URL || 'http://spring-orchestrator:8080';
const ML_ENGINE_URL = process.env.ML_ENGINE_URL || 'http://ml-engine:5000';

router.get('/', async (req: Request, res: Response) => {
  const timestamp = new Date().toISOString();

  const checks: Record<string, { status: 'healthy' | 'unhealthy'; details?: unknown }> = {
    mongodb: { status: 'healthy' },
    springOrchestrator: { status: 'healthy' },
    mlEngine: { status: 'healthy' },
  };

  // MongoDB
  const mongoOk = await mongoPing();
  if (!mongoOk) {
    checks.mongodb = { status: 'unhealthy', details: 'Database connection failed' };
  }

  // Spring Orchestrator
  try {
    await axios.get(`${SPRING_ORCHESTRATOR_URL}/actuator/health`, { timeout: 2000 });
  } catch (error: any) {
    checks.springOrchestrator = {
      status: 'unhealthy',
      details: error?.response?.data || error?.message || 'Spring health check failed',
    };
  }

  // ML Engine
  try {
    await axios.get(`${ML_ENGINE_URL}/health`, { timeout: 2000 });
  } catch (error: any) {
    checks.mlEngine = {
      status: 'unhealthy',
      details: error?.response?.data || error?.message || 'ML engine health check failed',
    };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    service: 'PerBillion API Gateway',
    timestamp,
    uptime: process.uptime(),
    checks,
  });
});

export default router;
