import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { QuizQuestion } from '../../store/educationStore';
import { slideInRight, successPulse, errorShake } from '../../utils/animations';

interface QuizSectionProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

export const QuizSection: React.FC<QuizSectionProps> = ({ questions, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleAnswerSelect = (answerIndex: number) => {
    if (showFeedback) return; // Prevent changing answer after submission
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleSubmitAnswer = () => {
    setShowFeedback(true);
  };

  const handleNextQuestion = () => {
    setShowFeedback(false);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate final score
      const correctCount = selectedAnswers.reduce((count, answer, index) => {
        return answer === questions[index].correctAnswer ? count + 1 : count;
      }, 0);
      const score = Math.round((correctCount / questions.length) * 100);
      setIsComplete(true);
      
      // Show confetti for passing scores
      if (score >= 70) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
      
      onComplete(score);
    }
  };

  const question = questions[currentQuestion];
  const selectedAnswer = selectedAnswers[currentQuestion];
  const isCorrect = selectedAnswer === question.correctAnswer;

  if (isComplete) {
    const correctCount = selectedAnswers.reduce((count, answer, index) => {
      return answer === questions[index].correctAnswer ? count + 1 : count;
    }, 0);
    const score = Math.round((correctCount / questions.length) * 100);
    
    return (
      <motion.div 
        className="text-center py-12"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        {showConfetti && (
          <Confetti
            width={window.innerWidth}
            height={window.innerHeight}
            recycle={false}
            numberOfPieces={500}
            gravity={0.3}
            colors={['#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e']}
          />
        )}
        
        <motion.div 
          className={`
            inline-flex items-center justify-center w-32 h-32 rounded-full mb-6
            ${score >= 70 ? 'bg-green-500/20' : 'bg-amber-500/20'}
          `}
          animate={score >= 70 ? { 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          } : errorShake}
          transition={{ duration: 0.6 }}
        >
          <motion.span 
            className="text-6xl"
            animate={score >= 70 ? { scale: [1, 1.3, 1] } : {}}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {score >= 70 ? '🎉' : '📚'}
          </motion.span>
        </motion.div>
        
        <motion.h3 
          className="text-3xl font-bold mb-4 text-gold-400"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {score >= 70 ? 'Well Done!' : 'Keep Learning!'}
        </motion.h3>
        
        <motion.p 
          className="text-xl text-gray-300 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Your Score: <motion.span 
            className="font-bold text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          >
            {score}%
          </motion.span>
        </motion.p>
        
        <motion.p 
          className="text-gray-400 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {correctCount} out of {questions.length} correct
        </motion.p>
        
        {score < 70 && (
          <motion.p 
            className="text-sm text-amber-400 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            Review the lesson content and try again to improve your score!
          </motion.p>
        )}
      </motion.div>
    );
  }

  return (
    <div className="quiz-section">
      {/* Progress bar */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <motion.span
            key={currentQuestion}
            initial={{ scale: 1.2, color: '#fbbf24' }}
            animate={{ scale: 1, color: '#9ca3af' }}
          >
            {Math.round(((currentQuestion + 1) / questions.length) * 100)}%
          </motion.span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-gold-400 to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <motion.div
              className="h-full w-full"
              animate={{ 
                backgroundPosition: ['0% 0%', '100% 0%'],
              }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                backgroundSize: '50% 100%',
              }}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Question */}
      <AnimatePresence mode="sync">
        <motion.h3 
          key={currentQuestion}
          className="text-2xl font-bold mb-6 text-white"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={slideInRight}
        >
          {question.question}
        </motion.h3>
      </AnimatePresence>

      {/* Options */}
      <div className="space-y-3 mb-6">
        <AnimatePresence mode="sync">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectOption = index === question.correctAnswer;
            const showCorrect = showFeedback && isCorrectOption;
            const showIncorrect = showFeedback && isSelected && !isCorrect;
            
            return (
              <motion.button
                key={`${currentQuestion}-${index}`}
                onClick={() => handleAnswerSelect(index)}
                disabled={showFeedback}
                className={`
                  w-full p-4 rounded-lg text-left transition-all duration-300
                  ${!showFeedback && isSelected 
                    ? 'bg-gold-500/30 border-2 border-gold-400 shadow-lg' 
                    : 'bg-gray-800 border-2 border-gray-700 hover:border-gray-600'
                  }
                  ${showCorrect 
                    ? 'bg-green-500/20 border-green-500 shadow-lg shadow-green-500/20' 
                    : ''
                  }
                  ${showIncorrect 
                    ? 'bg-red-500/20 border-red-500 shadow-lg shadow-red-500/20' 
                    : ''
                  }
                  ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}
                `}
                initial={{ opacity: 0, x: -20 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  ...(showCorrect ? successPulse : {}),
                  ...(showIncorrect ? errorShake : {})
                }}
                transition={{ delay: index * 0.1 }}
                whileHover={!showFeedback ? { scale: 1.02, x: 4 } : {}}
                whileTap={!showFeedback ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white">{option}</span>
                  <AnimatePresence>
                    {showCorrect && (
                      <motion.span 
                        className="text-green-400 text-xl"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                      >
                        ✓
                      </motion.span>
                    )}
                    {showIncorrect && (
                      <motion.span 
                        className="text-red-400 text-xl"
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                      >
                        ✗
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div 
            className={`
              p-4 rounded-lg mb-6
              ${isCorrect 
                ? 'bg-green-500/10 border border-green-500/50' 
                : 'bg-amber-500/10 border border-amber-500/50'
              }
            `}
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
          >
            <motion.p 
              className={`font-semibold ${isCorrect ? 'text-green-400' : 'text-amber-400'}`}
              initial={{ x: -10 }}
              animate={{ x: 0 }}
            >
              {isCorrect ? '✓ Correct!' : '✗ Not quite right'}
            </motion.p>
            {!isCorrect && (
              <motion.p 
                className="text-sm text-gray-300 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                The correct answer is: <strong>{question.options[question.correctAnswer]}</strong>
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex justify-end space-x-4">
        <AnimatePresence mode="sync">
          {!showFeedback ? (
            <motion.button
              key="submit"
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === undefined}
              className={`
                px-6 py-3 rounded-lg font-semibold transition-all duration-300
                ${selectedAnswer !== undefined
                  ? 'bg-gradient-to-r from-gold-400 to-amber-500 text-black'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              whileHover={selectedAnswer !== undefined ? { 
                scale: 1.05, 
                boxShadow: '0 10px 30px rgba(251, 191, 36, 0.4)' 
              } : {}}
              whileTap={selectedAnswer !== undefined ? { scale: 0.95 } : {}}
            >
              Submit Answer
            </motion.button>
          ) : (
            <motion.button
              key="next"
              onClick={handleNextQuestion}
              className="px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-gold-400 to-amber-500 text-black"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              whileHover={{ 
                scale: 1.05, 
                boxShadow: '0 10px 30px rgba(251, 191, 36, 0.4)',
                x: 4
              }}
              whileTap={{ scale: 0.95 }}
            >
              {currentQuestion < questions.length - 1 ? 'Next Question' : 'See Results'} →
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
