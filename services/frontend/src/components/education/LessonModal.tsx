import React, { useState, useEffect } from 'react';
import { Lesson } from '../../store/educationStore';
import { QuizSection } from './QuizSection';
import { LessonContentRenderer } from './LessonContentRenderer';

interface LessonModalProps {
  lesson: Lesson;
  onClose: () => void;
  onComplete: (quizScore: number, timeSpent: number) => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({ lesson, onClose, onComplete }) => {
  const [showQuiz, setShowQuiz] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleStartQuiz = () => {
    setShowQuiz(true);
    // Scroll to top of quiz
    const quizSection = document.getElementById('quiz-section');
    if (quizSection) {
      quizSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleQuizComplete = (score: number) => {
    const timeSpent = Math.round((Date.now() - startTime) / 60000); // Convert to minutes
    onComplete(score, timeSpent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl border border-gold-400/30 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-gold-500/20 to-amber-600/20 backdrop-blur-sm border-b border-gold-400/30 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className="px-3 py-1 bg-gold-500/20 text-gold-400 text-sm font-semibold rounded-full uppercase">
                  {lesson.level}
                </span>
                <span className="text-gray-400">Lesson {lesson.order}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">{lesson.duration}</span>
              </div>
              <h2 className="text-3xl font-bold text-white">{lesson.title}</h2>
            </div>
            
            <button
              onClick={onClose}
              className="ml-4 p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6 text-gray-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6 custom-scrollbar">
          {!showQuiz ? (
            <div className="animate-slide-up">
              {/* Lesson Content */}
              <div className="mb-8">
                {lesson.content && <LessonContentRenderer content={lesson.content} />}
              </div>

              {/* Start Quiz Button */}
              <div className="flex justify-center pt-6 border-t border-gray-800">
                <button
                  onClick={handleStartQuiz}
                  className="px-8 py-4 bg-gradient-to-r from-gold-400 to-amber-500 text-black font-bold text-lg rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                  Start Quiz 🎯
                </button>
              </div>
            </div>
          ) : (
            <div id="quiz-section">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gold-400 mb-2">Knowledge Check</h3>
                <p className="text-gray-400">Test your understanding of the lesson material.</p>
              </div>
              
              {lesson.quiz && (
                <QuizSection 
                  questions={lesson.quiz} 
                  onComplete={handleQuizComplete} 
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
