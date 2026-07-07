import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getDb } from '../utils/db';

const router = Router();

// GET /api/education/lessons - Fetch all lessons (optionally filtered by level)
router.get('/lessons', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { level } = req.query;
    const mongoDb = await getDb();
    
    const query = level ? { level: level.toString() } : {};
    const lessons = await mongoDb
      .collection('lessons')
      .find(query)
      .sort({ level: 1, order: 1 })
      .project({ content: 0 }) // Exclude content from list view
      .toArray();

    res.json({
      success: true,
      lessons: lessons.map(lesson => ({
        lessonId: lesson.lessonId,
        level: lesson.level,
        order: lesson.order,
        title: lesson.title,
        duration: lesson.duration,
        quizLength: lesson.quiz?.length || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lessons'
    });
  }
});

// GET /api/education/lessons/:lessonId - Fetch single lesson with content
router.get('/lessons/:lessonId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { lessonId } = req.params;
    const mongoDb = await getDb();
    
    const lesson = await mongoDb
      .collection('lessons')
      .findOne({ lessonId });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        error: 'Lesson not found'
      });
    }

    res.json({
      success: true,
      lesson: {
        lessonId: lesson.lessonId,
        level: lesson.level,
        order: lesson.order,
        title: lesson.title,
        duration: lesson.duration,
        content: lesson.content,
        quiz: lesson.quiz
      }
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lesson'
    });
  }
});

// GET /api/education/progress - Get user's education progress
router.get('/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const mongoDb = await getDb();
    
    let progress: any = await mongoDb
      .collection('education_progress')
      .findOne({ userId });

    // Initialize progress if doesn't exist
    if (!progress) {
      const newProgress = {
        userId,
        currentLevel: 'beginner',
        completedLessons: [],
        quizScores: {},
        streakDays: 0,
        totalTimeSpent: 0,
        badges: [],
        lastAccessedAt: new Date()
      };
      
      await mongoDb.collection('education_progress').insertOne(newProgress);
      progress = newProgress;
    } else {
      // Update last accessed
      await mongoDb.collection('education_progress').updateOne(
        { userId },
        { $set: { lastAccessedAt: new Date() } }
      );
    }

    res.json({
      success: true,
      progress: {
        currentLevel: progress.currentLevel,
        completedLessons: progress.completedLessons,
        quizScores: progress.quizScores,
        streakDays: progress.streakDays,
        totalTimeSpent: progress.totalTimeSpent,
        badges: progress.badges,
        lastAccessedAt: progress.lastAccessedAt
      }
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch progress'
    });
  }
});

// POST /api/education/progress - Update lesson completion and quiz score
router.post('/progress', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { lessonId, quizScore, timeSpent } = req.body;

    if (!lessonId || quizScore === undefined) {
      return res.status(400).json({
        success: false,
        error: 'lessonId and quizScore are required'
      });
    }

    const mongoDb = await getDb();
    
    // Fetch current progress
    let progress: any = await mongoDb
      .collection('education_progress')
      .findOne({ userId });

    if (!progress) {
      // Initialize if doesn't exist
      progress = {
        userId,
        currentLevel: 'beginner',
        completedLessons: [],
        quizScores: {},
        streakDays: 0,
        totalTimeSpent: 0,
        badges: [],
        lastAccessedAt: new Date()
      };
    }

    // Check if lesson already completed
    const alreadyCompleted = progress.completedLessons.some(
      (lesson: any) => lesson.lessonId === lessonId
    );

    // Update completion
    if (!alreadyCompleted) {
      progress.completedLessons.push({
        lessonId,
        completedAt: new Date(),
        quizScore: parseInt(quizScore)
      });
    } else {
      // Update existing completion with new score if higher
      progress.completedLessons = progress.completedLessons.map((lesson: any) => {
        if (lesson.lessonId === lessonId && parseInt(quizScore) > lesson.quizScore) {
          return { ...lesson, quizScore: parseInt(quizScore), completedAt: new Date() };
        }
        return lesson;
      });
    }

    // Update quiz scores
    progress.quizScores = progress.quizScores || {};
    progress.quizScores[lessonId] = Math.max(
      progress.quizScores[lessonId] || 0,
      parseInt(quizScore)
    );

    // Update time spent
    if (timeSpent) {
      progress.totalTimeSpent = (progress.totalTimeSpent || 0) + parseInt(timeSpent);
    }

    // Calculate streak
    const today = new Date().setHours(0, 0, 0, 0);
    const lastAccessed = new Date(progress.lastAccessedAt).setHours(0, 0, 0, 0);
    const daysDiff = (today - lastAccessed) / (1000 * 60 * 60 * 24);

    if (daysDiff === 1) {
      progress.streakDays++;
    } else if (daysDiff > 1) {
      progress.streakDays = 1;
    }
    // If daysDiff === 0, keep current streak

    // Award badges based on milestones
    const badges = new Set(progress.badges || []);
    const completedCount = progress.completedLessons.length;
    
    if (completedCount >= 1 && !badges.has('first-lesson')) badges.add('first-lesson');
    if (completedCount >= 5 && !badges.has('5-lessons')) badges.add('5-lessons');
    if (completedCount >= 10 && !badges.has('beginner-complete')) badges.add('beginner-complete');
    if (completedCount >= 20 && !badges.has('intermediate-complete')) badges.add('intermediate-complete');
    if (completedCount >= 30 && !badges.has('expert-complete')) badges.add('expert-complete');
    if (progress.streakDays >= 5 && !badges.has('5-day-streak')) badges.add('5-day-streak');
    if (progress.streakDays >= 10 && !badges.has('10-day-streak')) badges.add('10-day-streak');
    if (quizScore === 100 && !badges.has('perfect-score')) badges.add('perfect-score');
    
    progress.badges = Array.from(badges);
    progress.lastAccessedAt = new Date();

    // Determine level progression
    if (completedCount >= 10 && completedCount < 20) {
      progress.currentLevel = 'intermediate';
    } else if (completedCount >= 20) {
      progress.currentLevel = 'expert';
    }

    // Upsert progress
    await mongoDb.collection('education_progress').updateOne(
      { userId },
      { $set: progress },
      { upsert: true }
    );

    res.json({
      success: true,
      progress: {
        currentLevel: progress.currentLevel,
        completedLessons: progress.completedLessons,
        quizScores: progress.quizScores,
        streakDays: progress.streakDays,
        totalTimeSpent: progress.totalTimeSpent,
        badges: progress.badges,
        newBadges: Array.from(badges).filter(badge => 
          !req.body.existingBadges || !req.body.existingBadges.includes(badge)
        )
      }
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update progress'
    });
  }
});

// GET /api/education/stats - Get overall education statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const mongoDb = await getDb();
    
    const progress = await mongoDb
      .collection('education_progress')
      .findOne({ userId });

    if (!progress) {
      return res.json({
        success: true,
        stats: {
          totalLessons: 30,
          completedLessons: 0,
          currentLevel: 'beginner',
          averageQuizScore: 0,
          streakDays: 0,
          badges: [],
          totalTimeSpent: 0
        }
      });
    }

    // Calculate average quiz score
    const scores = Object.values(progress.quizScores || {}) as number[];
    const averageQuizScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    res.json({
      success: true,
      stats: {
        totalLessons: 30,
        completedLessons: progress.completedLessons.length,
        currentLevel: progress.currentLevel,
        averageQuizScore: Math.round(averageQuizScore),
        streakDays: progress.streakDays,
        badges: progress.badges,
        totalTimeSpent: progress.totalTimeSpent
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

export default router;
