import React, { useState, useEffect } from 'react';
import { Lesson } from '../../store/educationStore';
import { QuizSection } from './QuizSection';

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

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inList = false;
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside text-gray-300 space-y-2 mb-4 ml-4">
            {listItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    const formatInlineMarkdown = (text: string) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        .replace(/`(.*?)`/g, '<code class="px-2 py-1 bg-gray-800 text-gold-400 rounded text-sm">$1</code>');
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        flushList();
        return;
      }

      // Headers
      if (trimmed.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={`h1-${index}`} className="text-3xl font-bold text-gold-400 mb-4 mt-6">
            {trimmed.substring(2)}
          </h1>
        );
      } else if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={`h2-${index}`} className="text-2xl font-bold text-gold-400 mt-8 mb-4">
            {trimmed.substring(3)}
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={`h3-${index}`} className="text-xl font-bold text-white mt-6 mb-3">
            {trimmed.substring(4)}
          </h3>
        );
      }
      // List items
      else if (trimmed.match(/^[-*]\s/)) {
        inList = true;
        listItems.push(trimmed.substring(2));
      }
      // Numbered lists
      else if (trimmed.match(/^\d+\.\s/)) {
        flushList();
        const match = trimmed.match(/^\d+\.\s(.*)$/);
        if (match) {
          listItems.push(match[1]);
          inList = true;
        }
      }
      // Regular paragraphs
      else {
        flushList();
        elements.push(
          <p 
            key={`p-${index}`} 
            className="text-gray-300 leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(trimmed) }}
          />
        );
      }
    });

    flushList();
    return elements;
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
              <div className="prose-custom max-w-none mb-8">
                {lesson.content && renderContent(lesson.content)}
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
