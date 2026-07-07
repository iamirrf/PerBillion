import React from 'react';
import { motion } from 'framer-motion';
import { Lesson, CompletedLesson } from '../../store/educationStore';
import ProgressRing from './ProgressRing.tsx';

interface LessonCardProps {
  lesson: Lesson;
  isCompleted: boolean;
  isLocked: boolean;
  completionData?: CompletedLesson;
  onClick: () => void;
  index?: number;
}

export const LessonCard: React.FC<LessonCardProps> = ({ 
  lesson, 
  isCompleted, 
  isLocked, 
  completionData,
  onClick,
  index = 0
}) => {
  const quizScore = completionData?.quizScore || 0;
  
  return (
    <motion.div
      onClick={isLocked ? undefined : onClick}
      className={`
        premium-border-wrapper
        ${isLocked 
          ? 'opacity-40 cursor-not-allowed' 
          : 'cursor-pointer'
        }
      `}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
      whileHover={!isLocked ? { 
        y: -4
      } : {}}
      whileTap={!isLocked ? { scale: 0.98 } : {}}
    >
      <div className="premium-card-inner">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <motion.div 
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border
                ${isCompleted 
                  ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                  : isLocked 
                    ? 'bg-gray-800/50 text-gray-600 border-gray-700'
                    : 'bg-gold-500/10 text-gold-400 border-gold-500/30'
                }
              `}
              whileHover={!isLocked ? { scale: 1.1 } : {}}
            >
              {lesson.order}
            </motion.div>
            
            <div className="flex-1">
              <h3 className={`font-semibold ${
                isLocked ? 'text-gray-500' : 'text-gold-400'
              }`}>
                {lesson.title}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">{lesson.duration}</p>
            </div>
          </div>
          
          {/* Status icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.08 + 0.2, type: 'spring', stiffness: 300 }}
          >
            {isLocked ? (
              <div className="w-8 h-8 rounded-lg bg-gray-800/50 border border-gray-700 flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            ) : isCompleted ? (
              <div className="relative">
                <ProgressRing 
                  size={40} 
                  progress={quizScore} 
                  strokeWidth={3}
                  showLabel={true}
                />
              </div>
            ) : (
              <motion.div 
                className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center"
                whileHover={{ scale: 1.1, borderColor: 'rgba(251, 191, 36, 0.6)' }}
              >
                <svg className="w-4 h-4 text-gold-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs pt-3 border-t border-gold-500/10">
          <span className={isLocked ? 'text-gray-600' : 'text-gray-500'}>
            <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {lesson.quizLength} {lesson.quizLength === 1 ? 'Question' : 'Questions'}
          </span>
          
          {isCompleted && completionData && (
            <motion.span 
              className="text-green-400 font-semibold"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.08 + 0.4, type: 'spring' }}
            >
              {quizScore}%
            </motion.span>
          )}
          
          {!isCompleted && !isLocked && (
            <span className="text-gold-500 font-medium">
              Start →
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
