export interface CompletedLesson {
  lessonId: string;
  completedAt: Date;
  quizScore: number;
}

export interface LearningProgress {
  userId: string;
  currentLevel: 'beginner' | 'intermediate' | 'expert';
  completedLessons: CompletedLesson[];
  quizScores: Record<string, number>;
  streakDays: number;
  totalTimeSpent: number;
  badges: string[];
  lastAccessedAt: Date;
  lastCompletedAt?: Date;
  revision?: number;
}

export function initialProgress(userId: string, now = new Date()): LearningProgress {
  return { userId, currentLevel: 'beginner', completedLessons: [], quizScores: {},
    streakDays: 0, totalTimeSpent: 0, badges: [], lastAccessedAt: now, revision: 0 };
}

export function validLessonId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
}

export function validCompletion(lessonId: unknown, quizScore: unknown, timeSpent: unknown): boolean {
  return validLessonId(lessonId) && typeof quizScore === 'number' && Number.isInteger(quizScore) &&
    quizScore >= 0 && quizScore <= 100 && (timeSpent === undefined ||
      (typeof timeSpent === 'number' && Number.isInteger(timeSpent) && timeSpent >= 0 && timeSpent <= 1440));
}

function utcDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / 86400000;
}

// Only explicit fields are returned; Mongo's immutable _id can never enter $set.
export function completeLesson(progress: LearningProgress, lessonId: string, score: number,
  minutes = 0, now = new Date()): LearningProgress {
  const completed = [...(progress.completedLessons || [])];
  const existing = completed.findIndex((lesson) => lesson.lessonId === lessonId);
  if (existing < 0) completed.push({ lessonId, quizScore: score, completedAt: now });
  else if (score > completed[existing].quizScore) completed[existing] = { lessonId, quizScore: score, completedAt: now };

  // Accessing a lesson must not erase the previous completion date used for streaks.
  const priorCompletion = progress.lastCompletedAt || (progress.completedLessons || [])
    .reduce<Date | undefined>((latest, lesson) => !latest || new Date(lesson.completedAt) > latest ? new Date(lesson.completedAt) : latest, undefined);
  const dayGap = priorCompletion ? utcDay(now) - utcDay(new Date(priorCompletion)) : Infinity;
  const streak = dayGap === 0 ? Math.max(1, progress.streakDays || 0) : dayGap === 1 ? (progress.streakDays || 0) + 1 : 1;
  const badges = new Set(progress.badges || []);
  const milestones: Array<[number, string]> = [[1, 'first-lesson'], [5, '5-lessons'], [10, 'beginner-complete'],
    [20, 'intermediate-complete'], [30, 'expert-complete']];
  milestones.forEach(([count, badge]) => { if (completed.length >= count) badges.add(badge); });
  if (streak >= 5) badges.add('5-day-streak');
  if (streak >= 10) badges.add('10-day-streak');
  if (score === 100) badges.add('perfect-score');

  return {
    userId: progress.userId,
    currentLevel: completed.length >= 20 ? 'expert' : completed.length >= 10 ? 'intermediate' : 'beginner',
    completedLessons: completed,
    quizScores: { ...(progress.quizScores || {}), [lessonId]: Math.max(Number(progress.quizScores?.[lessonId]) || 0, score) },
    streakDays: streak,
    totalTimeSpent: (progress.totalTimeSpent || 0) + minutes,
    badges: [...badges],
    lastAccessedAt: now,
    lastCompletedAt: now,
    revision: (progress.revision || 0) + 1,
  };
}

export function publicProgress(progress: LearningProgress) {
  const { userId, revision, ...result } = progress;
  // Constructing this object from explicit fields also excludes a Mongo document's _id.
  return { currentLevel: result.currentLevel, completedLessons: result.completedLessons,
    quizScores: result.quizScores, streakDays: result.streakDays, totalTimeSpent: result.totalTimeSpent,
    badges: result.badges, lastAccessedAt: result.lastAccessedAt, lastCompletedAt: result.lastCompletedAt };
}
