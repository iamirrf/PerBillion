import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const MATH_MONEY_QUOTES = [
  {
    quote: "Compound interest is the eighth wonder of the world.",
    author: "Albert Einstein"
  },
  {
    quote: "In mathematics, you don't understand things. You just get used to them.",
    author: "John von Neumann"
  },
  {
    quote: "The stock market is a device for transferring money from the impatient to the patient.",
    author: "Warren Buffett"
  },
  {
    quote: "Price is what you pay. Value is what you get.",
    author: "Warren Buffett"
  },
  {
    quote: "Mathematics is the language with which God has written the universe.",
    author: "Galileo Galilei"
  },
  {
    quote: "Numbers have an important story to tell. They rely on you to give them a voice.",
    author: "Stephen Few"
  },
  {
    quote: "The four most dangerous words in investing are: 'this time it's different'.",
    author: "Sir John Templeton"
  },
  {
    quote: "Risk comes from not knowing what you're doing.",
    author: "Warren Buffett"
  },
  {
    quote: "In God we trust. All others must bring data.",
    author: "W. Edwards Deming"
  },
  {
    quote: "Mathematics is not about numbers, equations, or algorithms: it is about understanding.",
    author: "William Paul Thurston"
  },
  {
    quote: "The mathematics of finance is the language of money.",
    author: "Modern Wisdom"
  },
  {
    quote: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin"
  }
];

interface LoadingQuoteProps {
  message?: string;
  onCancel?: () => void;
  progress?: number; // 0-100
  stage?: string;
}

const LoadingQuote: React.FC<LoadingQuoteProps> = ({ 
  message = "Analyzing market data...",
  onCancel,
  progress = 0,
  stage
}) => {
  const [currentQuote, setCurrentQuote] = useState(MATH_MONEY_QUOTES[0]);

  useEffect(() => {
    // Randomly select a quote on mount
    const randomQuote = MATH_MONEY_QUOTES[Math.floor(Math.random() * MATH_MONEY_QUOTES.length)];
    setCurrentQuote(randomQuote);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 20 }}
        className="max-w-2xl mx-auto px-8 text-center"
      >
        {/* Animated Gold Spinner */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Outer ring */}
            <motion.div 
              className="w-32 h-32 border-4 border-gold-500/20 rounded-full"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            ></motion.div>
            
            {/* Spinning outer ring */}
            <motion.div 
              className="absolute top-0 left-0 w-32 h-32 border-4 border-transparent border-t-gold-500 border-r-gold-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            ></motion.div>
            
            {/* Spinning middle ring - reverse direction */}
            <motion.div 
              className="absolute top-3 left-3 border-4 border-transparent border-t-gold-400 border-l-gold-400 rounded-full" 
              style={{ width: '104px', height: '104px' }}
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            ></motion.div>
            
            {/* Inner spinning ring */}
            <motion.div 
              className="absolute top-6 left-6 w-20 h-20 border-4 border-transparent border-b-gold-600 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
            ></motion.div>
            
            {/* Animated pulse circles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div 
                className="w-16 h-16 bg-gold-500/10 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              ></motion.div>
            </div>
            
            {/* Gold Dollar Sign in Center */}
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="text-5xl font-bold text-gold-500" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display' }}>$</span>
            </motion.div>
          </div>
        </div>

        {/* Loading Message */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.h2 
            className="text-2xl font-bold text-gold-400 mb-4"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {message.replace(/\.\.\.$/, '')}
          </motion.h2>
          
          {/* Animated dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-gold-500 rounded-full"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.15
                }}
              ></motion.div>
            ))}
          </div>
          
          {/* Stage indicator */}
          {stage && (
            <motion.p 
              className="text-sm text-gold-500/80 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={stage}
            >
              {stage.replace(/\.\.\.$/, '')}
            </motion.p>
          )}
          
          {/* Progress bar */}
          {progress > 0 && (
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gold-500/70 font-medium">Progress</span>
                <motion.span 
                  className="text-sm font-bold text-gold-400"
                  key={progress}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                >
                  {Math.round(progress)}%
                </motion.span>
              </div>
              <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden border border-gold-500/20">
                <motion.div
                  className="h-full bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
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
            </div>
          )}
        </motion.div>

        {/* Quote Card */}
        <motion.div 
          className="bg-gradient-to-br from-gray-900/40 to-black/40 border border-gold-500/20 rounded-2xl p-8 backdrop-blur-md shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.div 
            className="mb-6"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <svg className="w-12 h-12 text-gold-500/40 mx-auto" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
          </motion.div>
          
          <motion.blockquote 
            className="text-xl text-gold-200 font-light italic leading-relaxed mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            "{currentQuote.quote}"
          </motion.blockquote>
          
          <motion.p 
            className="text-gold-500 font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            — {currentQuote.author}
          </motion.p>
        </motion.div>

        {/* Sophisticated floating particles animation */}
        <div className="mt-12 relative h-24 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-gold-500/30 rounded-full"
              style={{
                left: `${(i * 8) + 5}%`,
              }}
              animate={{
                y: [-10, -50, -10],
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{
                duration: 3 + (i % 3),
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut'
              }}
            ></motion.div>
          ))}
        </div>

        {/* Cancel button */}
        {onCancel && (
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button
              onClick={onCancel}
              className="px-6 py-3 bg-gray-800/80 text-gold-400 border border-gold-500/30 rounded-lg font-semibold"
              whileHover={{ scale: 1.05, borderColor: 'rgba(251, 191, 36, 0.5)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              Cancel
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default LoadingQuote;
