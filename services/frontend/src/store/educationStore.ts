import { create } from 'zustand';
import { educationAPI } from '../lib/api';

export interface Lesson {
  lessonId: string;
  level: 'beginner' | 'intermediate' | 'expert';
  order: number;
  title: string;
  duration: string;
  quizLength: number;
  content?: string;
  quiz?: QuizQuestion[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface CompletedLesson {
  lessonId: string;
  completedAt: Date;
  quizScore: number;
}

export interface EducationProgress {
  currentLevel: 'beginner' | 'intermediate' | 'expert';
  completedLessons: CompletedLesson[];
  quizScores: Record<string, number>;
  streakDays: number;
  totalTimeSpent: number;
  badges: string[];
  lastAccessedAt: Date;
}

export interface EducationStats {
  totalLessons: number;
  completedLessons: number;
  currentLevel: string;
  averageQuizScore: number;
  streakDays: number;
  badges: string[];
  totalTimeSpent: number;
}

interface EducationState {
  lessons: Lesson[];
  currentLesson: Lesson | null;
  progress: EducationProgress | null;
  stats: EducationStats | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchLessons: (level?: string) => Promise<void>;
  fetchLesson: (lessonId: string) => Promise<void>;
  fetchProgress: () => Promise<void>;
  updateProgress: (lessonId: string, quizScore: number, timeSpent?: number) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearCurrentLesson: () => void;
}

// Define functions outside of the store to prevent recreating them on every render
const fetchLessonsImpl = async (level: string | undefined, set: any) => {
  set({ loading: true, error: null });
  try {
    const data = await educationAPI.getLessons(level);
    if (data.success) {
      set({ lessons: data.lessons, loading: false });
    } else {
      set({ error: 'Failed to fetch lessons', loading: false });
    }
  } catch (error: any) {
    set({ 
      error: error.response?.data?.error || 'Failed to fetch lessons', 
      loading: false 
    });
  }
};

const fetchLessonImpl = async (lessonId: string, set: any) => {
  set({ loading: true, error: null });
  try {
    const data = await educationAPI.getLesson(lessonId);
    if (data.success) {
      set({ currentLesson: data.lesson, loading: false });
    } else {
      set({ error: 'Failed to fetch lesson', loading: false });
    }
  } catch (error: any) {
    set({ 
      error: error.response?.data?.error || 'Failed to fetch lesson', 
      loading: false 
    });
  }
};

const fetchProgressImpl = async (set: any) => {
  set({ loading: true, error: null });
  try {
    const data = await educationAPI.getProgress();
    if (data.success) {
      set({ progress: data.progress, loading: false });
    } else {
      set({ error: 'Failed to fetch progress', loading: false });
    }
  } catch (error: any) {
    set({ 
      error: error.response?.data?.error || 'Failed to fetch progress', 
      loading: false 
    });
  }
};

export const useEducationStore = create<EducationState>((set, get) => ({
  lessons: [],
  currentLesson: null,
  progress: null,
  stats: null,
  loading: false,
  error: null,

  fetchLessons: (level?: string) => fetchLessonsImpl(level, set),
  fetchLesson: (lessonId: string) => fetchLessonImpl(lessonId, set),
  fetchProgress: () => fetchProgressImpl(set),

  updateProgress: (lessonId: string, quizScore: number, timeSpent?: number) => {
    set({ loading: true, error: null });
    const currentBadges = get().progress?.badges || [];
    return educationAPI.updateProgress(lessonId, quizScore, timeSpent, currentBadges)
      .then(data => {
        if (data.success) {
          set({ progress: data.progress, loading: false });
          if (data.progress.newBadges && data.progress.newBadges.length > 0) {
            console.log('New badges earned:', data.progress.newBadges);
          }
        } else {
          set({ error: 'Failed to update progress', loading: false });
        }
      })
      .catch((error: any) => {
        set({ 
          error: error.response?.data?.error || 'Failed to update progress', 
          loading: false 
        });
      });
  },

  fetchStats: () => {
    set({ loading: true, error: null });
    return educationAPI.getStats()
      .then(data => {
        if (data.success) {
          set({ stats: data.stats, loading: false });
        } else {
          set({ error: 'Failed to fetch stats', loading: false });
        }
      })
      .catch((error: any) => {
        set({ 
          error: error.response?.data?.error || 'Failed to fetch stats', 
          loading: false 
        });
      });
  },

  clearCurrentLesson: () => {
    set({ currentLesson: null });
  }
}));
