import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { challenges, CHALLENGE_PACK_VERSION } from '../data/challenges';
import { requireAcademyAccess } from '../utils/membership';
import { getDb } from '../utils/db';
import logger from '../utils/logger';
import { recordFunnelEvent, utcWeekKey } from '../utils/analytics';

const router = Router();
router.use(authenticateToken, requireAcademyAccess);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const week = utcWeekKey();
    void recordFunnelEvent('weekly_returned', req.user!.id, { challengePack: CHALLENGE_PACK_VERSION }, `weekly-return:${req.user!.id}:${week}`);
    const progress = await (await getDb()).collection<any>('challenge_progress')
      .find({ userId: req.user!.id, packVersion: CHALLENGE_PACK_VERSION })
      .project({ challengeId: 1, completedAt: 1, updatedAt: 1 })
      .toArray();
    const byId = new Map(progress.map(item => [item.challengeId, item]));
    return res.json({ packVersion: CHALLENGE_PACK_VERSION, challenges: challenges.map(item => ({ ...item, progress: byId.get(item.id) || null })) });
  } catch (error) {
    logger.error('Challenge catalog failed:', error);
    return res.status(503).json({ error: 'Weekly missions are temporarily unavailable' });
  }
});

router.put('/:challengeId', async (req: AuthRequest, res: Response) => {
  const challenge = challenges.find(item => item.id === req.params.challengeId);
  const reflection = typeof req.body?.reflection === 'string' ? req.body.reflection.trim() : '';
  if (!challenge) return res.status(404).json({ error: 'Mission not found' });
  if (reflection.length < 20 || reflection.length > 1_500) return res.status(400).json({ error: 'Write a reflection of 20–1500 characters' });
  try {
    const now = new Date();
    const collection = (await getDb()).collection<any>('challenge_progress');
    await collection.createIndex({ userId: 1, challengeId: 1, packVersion: 1 }, { unique: true });
    await collection.updateOne(
      { userId: req.user!.id, challengeId: challenge.id, packVersion: CHALLENGE_PACK_VERSION },
      { $set: { reflection, completedAt: now, updatedAt: now }, $setOnInsert: { userId: req.user!.id, challengeId: challenge.id, packVersion: CHALLENGE_PACK_VERSION, createdAt: now } },
      { upsert: true },
    );
    return res.json({ completed: true, completedAt: now });
  } catch (error) {
    logger.error('Challenge save failed:', error);
    return res.status(503).json({ error: 'Your mission reflection could not be saved' });
  }
});

export default router;
