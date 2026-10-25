import { Router, Response } from 'express';
import { authenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { getDb } from '../utils/db';
import { completeLesson, initialProgress, LearningProgress, publicProgress, validCompletion, validLessonId } from '../utils/educationProgress';
import logger from '../utils/logger';
import curriculumV2Ids from '../data/curriculum-v2-ids.json';

const router = Router();
const levels = ['beginner', 'intermediate', 'expert'];
const currentLessonIds = new Set(curriculumV2Ids);
let currentProgressIndex: Promise<string> | undefined;

async function v2Collection() {
  const collection = (await getDb()).collection<{
    userId: string; lessonId: string; score: number; completedAt: Date;
  }>('education_progress_v2');
  // The unique key makes simultaneous completions from two devices safe.
  if (!currentProgressIndex) {
    currentProgressIndex = collection.createIndex({ userId: 1, lessonId: 1 }, { unique: true })
      .catch(error => { currentProgressIndex = undefined; throw error; });
  }
  await currentProgressIndex;
  return collection;
}

// The current 24 lessons have independent progress. Legacy completions remain in
// education_progress and can still be read as a prior-coursework transcript.
router.get('/v2/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await (await v2Collection()).find({ userId: req.user!.id }).toArray();
    const completed: Record<string, { score: number; completedAt: Date }> = {};
    for (const row of rows) {
      if (currentLessonIds.has(row.lessonId)) completed[row.lessonId] = {
        score: row.score, completedAt: row.completedAt,
      };
    }
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, completed });
  } catch (error) {
    logger.error('Error fetching current curriculum progress:', error);
    return res.status(503).json({ success: false, error: 'Progress is temporarily unavailable' });
  }
});

router.put('/v2/progress/:lessonId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { lessonId } = req.params;
  const { score } = req.body || {};
  if (!currentLessonIds.has(lessonId) || !Number.isInteger(score) || score < 0 || score > 100) {
    return res.status(400).json({ success: false, error: 'Choose a current lesson and an integer score from 0–100' });
  }
  try {
    const row = await (await v2Collection()).findOneAndUpdate(
      { userId: req.user!.id, lessonId },
      { $setOnInsert: { userId: req.user!.id, lessonId, completedAt: new Date() }, $max: { score } },
      { upsert: true, returnDocument: 'after' },
    );
    if (!row) throw new Error('Progress update returned no document');
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, completion: { score: row.score, completedAt: row.completedAt } });
  } catch (error) {
    logger.error('Error saving current curriculum progress:', error);
    return res.status(503).json({ success: false, error: 'Unable to save progress. Please try again.' });
  }
});

router.delete('/v2/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await (await v2Collection()).deleteMany({ userId: req.user!.id });
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, completed: {} });
  } catch (error) {
    logger.error('Error resetting current curriculum progress:', error);
    return res.status(503).json({ success: false, error: 'Unable to reset progress. Please try again.' });
  }
});

// Educational content is free to read without an account.
router.get('/lessons', async (req, res: Response) => {
  const { level } = req.query;
  if (level !== undefined && (typeof level !== 'string' || !levels.includes(level))) {
    return res.status(400).json({ success: false, error: 'Choose beginner, intermediate, or expert' });
  }
  try {
    const db = await getDb();
    const lessons = await db.collection('lessons').find(level ? { level } : {})
      .project({ lessonId: 1, level: 1, order: 1, title: 1, duration: 1, quiz: 1 }).toArray();
    lessons.sort((a, b) => levels.indexOf(a.level) - levels.indexOf(b.level) || a.order - b.order);
    return res.json({ success: true, lessons: lessons.map(lesson => ({
      lessonId: lesson.lessonId, level: lesson.level, order: lesson.order,
      title: lesson.title, duration: lesson.duration, quizLength: lesson.quiz?.length || 0,
    })) });
  } catch (error) {
    logger.error('Error fetching lessons:', error);
    return res.status(503).json({ success: false, error: 'Lessons are temporarily unavailable' });
  }
});

router.get('/lessons/:lessonId', async (req, res: Response) => {
  if (!validLessonId(req.params.lessonId)) return res.status(400).json({ success: false, error: 'Invalid lesson ID' });
  try {
    const db = await getDb();
    const lesson = await db.collection('lessons').findOne({ lessonId: req.params.lessonId });
    if (!lesson) return res.status(404).json({ success: false, error: 'Lesson not found' });
    return res.json({ success: true, lesson: {
      lessonId: lesson.lessonId, level: lesson.level, order: lesson.order, title: lesson.title,
      duration: lesson.duration, content: lesson.content, quiz: lesson.quiz,
    } });
  } catch (error) {
    logger.error('Error fetching lesson:', error);
    return res.status(503).json({ success: false, error: 'This lesson is temporarily unavailable' });
  }
});

router.get('/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user!.id;
    const progress = await db.collection<LearningProgress>('education_progress').findOneAndUpdate(
      { userId }, { $setOnInsert: initialProgress(userId) }, { upsert: true, returnDocument: 'after' });
    return res.json({ success: true, progress: publicProgress(progress!) });
  } catch (error) {
    logger.error('Error fetching progress:', error);
    return res.status(503).json({ success: false, error: 'Your progress is temporarily unavailable' });
  }
});

router.post('/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { lessonId, quizScore, timeSpent } = req.body;
  if (!validCompletion(lessonId, quizScore, timeSpent)) {
    return res.status(400).json({ success: false,
      error: 'Provide a valid lesson ID, an integer score from 0–100, and optional minutes from 0–1440' });
  }
  try {
    const db = await getDb();
    if (!await db.collection('lessons').findOne({ lessonId }, { projection: { _id: 1 } })) {
      return res.status(404).json({ success: false, error: 'Lesson not found' });
    }
    const userId = req.user!.id;
    const collection = db.collection<LearningProgress>('education_progress');
    await collection.updateOne({ userId }, { $setOnInsert: initialProgress(userId) }, { upsert: true });

    // Optimistic concurrency prevents two open lessons overwriting each other's progress.
    for (let attempt = 0; attempt < 4; attempt++) {
      const current = await collection.findOne({ userId });
      if (!current) break;
      const next = completeLesson(current, lessonId, quizScore, timeSpent);
      const result = await collection.updateOne({ userId,
        revision: current.revision === undefined ? { $exists: false } : current.revision }, { $set: next });
      if (result.matchedCount) {
        const newBadges = next.badges.filter(badge => !current.badges?.includes(badge));
        return res.json({ success: true, progress: { ...publicProgress(next), newBadges } });
      }
    }
    return res.status(409).json({ success: false, error: 'Progress changed in another tab. Please try again.' });
  } catch (error) {
    logger.error('Error updating progress:', error);
    return res.status(503).json({ success: false, error: 'Unable to save progress. Please try again.' });
  }
});

router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const [progress, totalLessons] = await Promise.all([
      db.collection<LearningProgress>('education_progress').findOne({ userId: req.user!.id }),
      db.collection('lessons').countDocuments(),
    ]);
    const scores = Object.values(progress?.quizScores || {});
    return res.json({ success: true, stats: {
      totalLessons,
      completedLessons: progress?.completedLessons.length || 0,
      currentLevel: progress?.currentLevel || 'beginner',
      averageQuizScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      streakDays: progress?.streakDays || 0, badges: progress?.badges || [], totalTimeSpent: progress?.totalTimeSpent || 0,
    } });
  } catch (error) {
    logger.error('Error fetching education stats:', error);
    return res.status(503).json({ success: false, error: 'Learning statistics are temporarily unavailable' });
  }
});

// Curriculum changes are administrator operations, never available to student accounts.
router.post('/seed', authenticateToken, requireRole(['admin']), async (_req, res: Response) => {
  try {
    const db = await getDb();
    const beginner = require('../../../../database/mongodb/seeds/beginner-lessons');
    const intermediate = require('../../../../database/mongodb/seeds/intermediate-lessons');
    const expert = require('../../../../database/mongodb/seeds/expert-lessons');
    const lessons = [...beginner, ...intermediate, ...expert];
    for (const lesson of lessons) {
      await db.collection('lessons').updateOne({ lessonId: lesson.lessonId }, { $set: {
        lessonId: lesson.lessonId, level: lesson.level, order: lesson.order,
        title: lesson.title, duration: lesson.duration, content: lesson.content, quiz: lesson.quiz, updatedAt: new Date(),
      } }, { upsert: true });
    }
    return res.json({ success: true, totalLessons: lessons.length });
  } catch (error) {
    logger.error('Error seeding lessons:', error);
    return res.status(500).json({ success: false, error: 'Unable to update the curriculum' });
  }
});

export default router;
