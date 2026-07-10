import React, { useEffect, useState } from 'react';
import { useEducationStore } from '../store/educationStore';
import { LevelSelector } from '../components/education/LevelSelector';
import { LessonCard } from '../components/education/LessonCard';
import { LessonModal } from '../components/education/LessonModal';
import LoadingQuote from '../components/LoadingQuote';

export const Education: React.FC = () => {
  const {
    lessons,
    currentLesson,
    progress,
    loading,
    error,
    fetchLessons,
    fetchLesson,
    fetchProgress,
    updateProgress,
    clearCurrentLesson
  } = useEducationStore();

  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'expert'>('beginner');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchProgress();
    fetchLessons();
  }, []); // Empty deps - functions are now stable

  useEffect(() => {
    if (progress) {
      // Auto-select current level based on progress
      setSelectedLevel(progress.currentLevel);
    }
  }, [progress]);

  const handleLevelChange = (level: 'beginner' | 'intermediate' | 'expert') => {
    setSelectedLevel(level);
    fetchLessons(level);
  };

  const handleLessonClick = async (lessonId: string) => {
    await fetchLesson(lessonId);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    clearCurrentLesson();
  };

  const handleLessonComplete = async (quizScore: number, timeSpent: number) => {
    if (currentLesson) {
      await updateProgress(currentLesson.lessonId, quizScore, timeSpent);
      setTimeout(() => {
        setShowModal(false);
        clearCurrentLesson();
        fetchLessons(selectedLevel); // Refresh lessons
      }, 3000); // Give time to see results
    }
  };

  const isLessonCompleted = (lessonId: string) => {
    return progress?.completedLessons.some(cl => cl.lessonId === lessonId) || false;
  };

  const isLessonLocked = (lessonOrder: number) => {
    // First lesson of each level is always unlocked
    if (lessonOrder === 1) return false;
    
    // Check if previous lesson is completed
    const previousLesson = lessons.find(l => l.order === lessonOrder - 1 && l.level === selectedLevel);
    if (!previousLesson) return false;
    
    return !isLessonCompleted(previousLesson.lessonId);
  };

  const getCompletionData = (lessonId: string) => {
    return progress?.completedLessons.find(cl => cl.lessonId === lessonId);
  };

  const filteredLessons = lessons.filter(l => l.level === selectedLevel);
  const completedCount = filteredLessons.filter(l => isLessonCompleted(l.lessonId)).length;
  const progressPercent = filteredLessons.length > 0 
    ? Math.round((completedCount / filteredLessons.length) * 100) 
    : 0;

  if (loading && !lessons.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingQuote />
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gold-400 to-amber-500 bg-clip-text text-transparent mb-2">
                📚 PerBillion Academy
              </h1>
              <p className="text-gray-400 text-lg">
                Master trading and investing from foundation to elite level
              </p>
            </div>
            
            {/* Stats Badge */}
            {progress && (
              <div className="bg-gradient-to-br from-gold-500/20 to-amber-600/20 rounded-xl p-4 border border-gold-400/30">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gold-400">{progress.streakDays}</div>
                  <div className="text-xs text-gray-400 uppercase">Day Streak 🔥</div>
                </div>
              </div>
            )}
          </div>

          {/* Overall Progress Bar */}
          {progress && (
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex justify-between text-sm text-gray-400 mb-2">
                <span>Total Progress: {progress.completedLessons.length} / 30 lessons</span>
                <span>{Math.round((progress.completedLessons.length / 30) * 100)}%</span>
              </div>
              <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-gold-400 to-amber-500 transition-all duration-1000"
                  style={{ width: `${(progress.completedLessons.length / 30) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Level Selector */}
        <LevelSelector currentLevel={selectedLevel} onLevelChange={handleLevelChange} />

        {/* Level Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl font-bold text-white">
              {selectedLevel === 'beginner' && '🔨 Foundation Forge'}
              {selectedLevel === 'intermediate' && '⚔️ Strategy Summit'}
              {selectedLevel === 'expert' && '👑 Elite Edge'}
            </h2>
            <span className="text-gold-400 font-semibold">
              {completedCount} / {filteredLessons.length} completed ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-gold-400 to-amber-500 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 animate-slide-up">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Lesson Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
          {filteredLessons.length === 0 && !loading && (
            <div className="col-span-full text-center text-gray-400 py-12">
              No lessons found for {selectedLevel} level
            </div>
          )}
          {filteredLessons.map((lesson, index) => (
            <LessonCard
              key={lesson.lessonId}
              lesson={lesson}
              isCompleted={isLessonCompleted(lesson.lessonId)}
              isLocked={isLessonLocked(lesson.order)}
              completionData={getCompletionData(lesson.lessonId)}
              onClick={() => handleLessonClick(lesson.lessonId)}
              index={index}
            />
          ))}
        </div>

      </div>

      {/* Lesson Modal */}
      {showModal && currentLesson && (
        <LessonModal
          lesson={currentLesson}
          onClose={handleModalClose}
          onComplete={handleLessonComplete}
        />
      )}
    </div>
  );
};
