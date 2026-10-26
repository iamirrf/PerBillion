import { Router, Response } from 'express';
import { authenticateToken, optionalAuthenticateToken, AuthRequest, requireRole } from '../middleware/auth';
import { getDb } from '../utils/db';
import { completeLesson, initialProgress, LearningProgress, publicProgress, validCompletion, validLessonId } from '../utils/educationProgress';
import logger from '../utils/logger';
import curriculumV2Ids from '../data/curriculum-v2-ids.json';
import { assessmentFor, curriculum, CURRICULUM_VERSION, PREVIEW_LESSONS, publicCatalog } from '../data/curriculum-v3';
import { randomUUID } from 'crypto';
import { membershipStatus, requireAcademyAccess } from '../utils/membership';
import { recordFunnelEvent } from '../utils/analytics';

const router = Router();
const levels = ['beginner', 'intermediate', 'expert'];
const currentLessonIds = new Set(curriculumV2Ids);
let currentProgressIndex: Promise<string> | undefined;
let exerciseProgressIndex: Promise<string> | undefined;
let v3Indexes: Promise<unknown> | undefined;

async function ensureV3Indexes() {
  if (!v3Indexes) v3Indexes = (async () => {
    const db = await getDb();
    await Promise.all([
      db.collection('learning_attempts').createIndex({ userId: 1, lessonId: 1, idempotencyKey: 1 }, { unique: true, sparse: true }),
      db.collection('learning_mastery').createIndex({ userId: 1, lessonId: 1, curriculumVersion: 1 }, { unique: true }),
      db.collection('learning_exercises_v3').createIndex({ userId: 1, lessonId: 1, curriculumVersion: 1 }, { unique: true }),
    ]);
  })().catch(error => { v3Indexes = undefined; throw error; });
  return v3Indexes;
}

async function lessonAccess(req: AuthRequest, lessonId: string, res: Response) {
  if (PREVIEW_LESSONS.has(lessonId)) return true;
  if (!req.user) {
    res.status(401).json({ code: 'AUTHENTICATION_REQUIRED', error: 'Sign in to continue', returnTo: `/app/learn/${lessonId}` });
    return false;
  }
  const membership = await membershipStatus(req.user.id);
  if (!membership.hasAcademyAccess) {
    res.status(403).json({ code: 'MEMBERSHIP_REQUIRED', error: 'Membership is required for this academy lesson.', membership, returnTo: `/app/learn/${lessonId}` });
    return false;
  }
  return true;
}

router.get('/v3/catalog', (_req: AuthRequest, res: Response) => {
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ curriculumVersion: CURRICULUM_VERSION, lessons: publicCatalog() });
});

router.get('/v3/lessons/:lessonId', optionalAuthenticateToken, async (req: AuthRequest, res: Response) => {
  const lesson = curriculum.find(item => item.id === req.params.lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (!await lessonAccess(req, lesson.id, res)) return;
  const assessment = assessmentFor(lesson);
  const questions = assessment.questions.map(({ explanation: _explanation, ...question }) => question);
  if (PREVIEW_LESSONS.has(lesson.id)) void recordFunnelEvent('preview_viewed', req.user?.id || null, { lessonId: lesson.id });
  res.set('Cache-Control', 'private, no-store');
  return res.json({ curriculumVersion: CURRICULUM_VERSION, lesson: { ...lesson, preview: PREVIEW_LESSONS.has(lesson.id), questions } });
});

router.post('/v3/lessons/:lessonId/exercise', authenticateToken, async (req: AuthRequest, res: Response) => {
  const lesson = curriculum.find(item => item.id === req.params.lessonId);
  const response = typeof req.body?.response === 'string' ? req.body.response.trim() : '';
  if (!lesson || response.length < 20 || response.length > 1000) return res.status(400).json({ error: 'Submit a concrete response of 20–1000 characters' });
  try {
    if (!await lessonAccess(req, lesson.id, res)) return;
    await ensureV3Indexes();
    const now = new Date();
    const db = await getDb();
    await db.collection('learning_exercises_v3').updateOne(
      { userId: req.user!.id, lessonId: lesson.id, curriculumVersion: CURRICULUM_VERSION },
      { $set: { response, completedAt: now, updatedAt: now }, $setOnInsert: { userId: req.user!.id, lessonId: lesson.id, curriculumVersion: CURRICULUM_VERSION, createdAt: now } },
      { upsert: true },
    );
    const passing: any = await db.collection('learning_attempts').find({ userId: req.user!.id, lessonId: lesson.id, curriculumVersion: CURRICULUM_VERSION, passed: true }).sort({ score: -1, createdAt: 1 }).limit(1).next();
    if (passing) await db.collection('learning_mastery').updateOne(
      { userId: req.user!.id, lessonId: lesson.id, curriculumVersion: CURRICULUM_VERSION },
      { $max: { score: passing.score }, $set: { masteredAt: now, updatedAt: now }, $setOnInsert: { userId: req.user!.id, lessonId: lesson.id, curriculumVersion: CURRICULUM_VERSION, createdAt: now } },
      { upsert: true },
    );
    if (passing) void recordFunnelEvent('activation_completed', req.user!.id, { lessonId: lesson.id }, `activation:${req.user!.id}:${lesson.id}`);
    return res.json({ completed: true, mastered: Boolean(passing), completedAt: now, takeaway: lesson.takeaway });
  } catch (error) {
    logger.error('Error saving v3 exercise:', error);
    return res.status(503).json({ error: 'The exercise could not be saved' });
  }
});

router.post('/v3/lessons/:lessonId/attempts', optionalAuthenticateToken, async (req: AuthRequest, res: Response) => {
  const lesson = curriculum.find(item => item.id === req.params.lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  if (!await lessonAccess(req, lesson.id, res)) return;
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const idempotencyKey = typeof req.body?.idempotencyKey === 'string' && /^[a-zA-Z0-9-]{8,80}$/.test(req.body.idempotencyKey) ? req.body.idempotencyKey : randomUUID();
  if (answers.length !== 5 || answers.some((answer: unknown) => typeof answer !== 'number' || !Number.isInteger(answer) || answer < 0 || answer > 2)) return res.status(400).json({ error: 'Answer all five questions' });
  const assessment = assessmentFor(lesson);
  const results = assessment.questions.map((question, index) => ({ questionId: question.id, correct: answers[index] === assessment.correct[index], correctOption: assessment.correct[index], explanation: question.explanation }));
  const score = results.filter(item => item.correct).length * 20;
  if (!req.user) return res.json({ score, passed: score >= 80, results, saved: false, message: 'Create a free account to save verified mastery.' });
  try {
    await ensureV3Indexes();
    const db = await getDb();
    const now = new Date();
    const attempt = { userId: req.user.id, lessonId: lesson.id, curriculumVersion: CURRICULUM_VERSION, idempotencyKey, answers, results, score, passed: score >= 80, createdAt: now };
    await db.collection('learning_attempts').updateOne({ userId: req.user.id, lessonId: lesson.id, idempotencyKey }, { $setOnInsert: attempt }, { upsert: true });
    const exercise = await db.collection('learning_exercises_v3').findOne({ userId: req.user.id, lessonId: lesson.id, curriculumVersion: CURRICULUM_VERSION });
    const mastered = score >= 80 && Boolean(exercise);
    if (mastered) await db.collection('learning_mastery').updateOne(
      { userId: req.user.id, lessonId: lesson.id, curriculumVersion: CURRICULUM_VERSION },
      { $max: { score }, $set: { masteredAt: now, updatedAt: now }, $setOnInsert: { userId: req.user.id, lessonId: lesson.id, curriculumVersion: CURRICULUM_VERSION, createdAt: now } },
      { upsert: true },
    );
    if (mastered) void recordFunnelEvent('activation_completed', req.user.id, { lessonId: lesson.id }, `activation:${req.user.id}:${lesson.id}`);
    return res.json({ score, passed: score >= 80, mastered, exerciseRequired: !exercise, results, saved: true });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ error: 'This assessment was already submitted' });
    logger.error('Error saving v3 attempt:', error);
    return res.status(503).json({ error: 'The assessment could not be saved' });
  }
});

router.get('/v3/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await ensureV3Indexes();
    const db = await getDb();
    const [mastery, exercises, prior] = await Promise.all([
      db.collection('learning_mastery').find({ userId: req.user!.id, curriculumVersion: CURRICULUM_VERSION }).toArray(),
      db.collection('learning_exercises_v3').find({ userId: req.user!.id, curriculumVersion: CURRICULUM_VERSION }).toArray(),
      (await v2Collection()).find({ userId: req.user!.id }).toArray(),
    ]);
    return res.json({ curriculumVersion: CURRICULUM_VERSION, mastery, exercises, priorCompletions: prior });
  } catch (error) {
    logger.error('Error fetching v3 progress:', error);
    return res.status(503).json({ error: 'Mastery progress is temporarily unavailable' });
  }
});

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

async function v2ExerciseCollection() {
  const collection = (await getDb()).collection<{
    userId: string; lessonId: string; completedAt: Date;
  }>('education_exercises_v2');
  if (!exerciseProgressIndex) {
    exerciseProgressIndex = collection.createIndex({ userId: 1, lessonId: 1 }, { unique: true })
      .catch(error => { exerciseProgressIndex = undefined; throw error; });
  }
  await exerciseProgressIndex;
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
  const lessonId = typeof req.params.lessonId === 'string' ? req.params.lessonId : '';
  const { score } = req.body || {};
  if (!currentLessonIds.has(lessonId) || !Number.isInteger(score) || score < 0 || score > 100) {
    return res.status(400).json({ success: false, error: 'Choose a current lesson and an integer score from 0–100' });
  }
  try {
    if (!await lessonAccess(req, lessonId, res)) return;
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

router.get('/v2/exercises', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await (await v2ExerciseCollection()).find({ userId: req.user!.id }).toArray();
    const completed: Record<string, Date> = {};
    for (const row of rows) if (currentLessonIds.has(row.lessonId)) completed[row.lessonId] = row.completedAt;
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, completed });
  } catch (error) {
    logger.error('Error fetching lesson exercise progress:', error);
    return res.status(503).json({ success: false, error: 'Exercise progress is temporarily unavailable' });
  }
});

router.put('/v2/exercises/:lessonId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const lessonId = typeof req.params.lessonId === 'string' ? req.params.lessonId : '';
  if (!currentLessonIds.has(lessonId)) return res.status(400).json({ success: false, error: 'Choose a current lesson' });
  try {
    if (!await lessonAccess(req, lessonId, res)) return;
    const row = await (await v2ExerciseCollection()).findOneAndUpdate(
      { userId: req.user!.id, lessonId },
      { $setOnInsert: { userId: req.user!.id, lessonId, completedAt: new Date() } },
      { upsert: true, returnDocument: 'after' },
    );
    if (!row) throw new Error('Exercise progress update returned no document');
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, completion: { completedAt: row.completedAt } });
  } catch (error) {
    logger.error('Error saving lesson exercise progress:', error);
    return res.status(503).json({ success: false, error: 'Unable to save exercise progress. Please try again.' });
  }
});

router.delete('/v2/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const [progress, exercises] = await Promise.all([v2Collection(), v2ExerciseCollection()]);
    await Promise.all([progress.deleteMany({ userId: req.user!.id }), exercises.deleteMany({ userId: req.user!.id })]);
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, completed: {} });
  } catch (error) {
    logger.error('Error resetting current curriculum progress:', error);
    return res.status(503).json({ success: false, error: 'Unable to reset progress. Please try again.' });
  }
});

// Product coursework is available after sign-in; the public site carries its own preview.
router.get('/lessons', authenticateToken, requireAcademyAccess, async (req, res: Response) => {
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

router.get('/lessons/:lessonId', authenticateToken, requireAcademyAccess, async (req, res: Response) => {
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

router.post('/progress', authenticateToken, requireAcademyAccess, async (req: AuthRequest, res: Response) => {
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
