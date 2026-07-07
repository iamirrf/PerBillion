import React from 'react';
import { motion } from 'framer-motion';

interface LevelSelectorProps {
  currentLevel: 'beginner' | 'intermediate' | 'expert';
  onLevelChange: (level: 'beginner' | 'intermediate' | 'expert') => void;
}

const levelInfo = {
  beginner: {
    name: 'Foundation',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    description: 'Essential Principles',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #ffb300 50%, #ffc107 100%)'
  },
  intermediate: {
    name: 'Strategy',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    description: 'Advanced Techniques',
    gradient: 'linear-gradient(135deg, #ffc107 0%, #ffb300 50%, #fbbf24 100%)'
  },
  expert: {
    name: 'Mastery',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    description: 'Elite Performance',
    gradient: 'linear-gradient(135deg, #ffb300 0%, #ffc107 50%, #fbbf24 100%)'
  }
};

export const LevelSelector: React.FC<LevelSelectorProps> = ({ currentLevel, onLevelChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {(Object.keys(levelInfo) as Array<'beginner' | 'intermediate' | 'expert'>).map((level, idx) => {
        const info = levelInfo[level];
        const isActive = currentLevel === level;
        
        return (
          <motion.div
            key={level}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={isActive ? 'glow-card' : ''}
            style={isActive ? {
              '--glow-gradient': info.gradient
            } as React.CSSProperties : {}}
          >
            <button
              onClick={() => onLevelChange(level)}
              className={`
                w-full h-full text-left transition-all duration-300
                ${isActive ? 'glow-card-content' : 'premium-border-wrapper'}
              `}
            >
              <div className={!isActive ? 'premium-card-inner' : ''}>
                <div className="p-6">
                  {/* Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <motion.div 
                      className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        isActive 
                          ? 'bg-gradient-to-br from-gold-500/30 to-gold-600/30 border border-gold-500/50' 
                          : 'bg-gold-500/10 border border-gold-500/30'
                      }`}
                      whileHover={{ scale: 1.05, rotate: 5 }}
                    >
                      <div className={isActive ? 'text-gold-400' : 'text-gold-500'}>
                        {info.icon}
                      </div>
                    </motion.div>
                    
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-3 h-3 bg-gold-400 rounded-full shadow-lg shadow-gold-500/50"
                      >
                        <div className="w-full h-full bg-gold-400 rounded-full animate-ping"></div>
                      </motion.div>
                    )}
                  </div>

                  {/* Content */}
                  <h3 className={`text-2xl font-bold mb-2 ${
                    isActive ? 'text-gold-400' : 'text-gold-500'
                  }`}>
                    {info.name}
                  </h3>
                  <p className={`text-sm ${
                    isActive ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {info.description}
                  </p>

                  {/* Progress indicator */}
                  {isActive && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="mt-4 h-1 bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 rounded-full"
                    ></motion.div>
                  )}
                </div>
              </div>
            </button>
          </motion.div>
        );
      })}
    </div>
  );
};
