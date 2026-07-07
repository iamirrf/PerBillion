import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      {/* Navigation */}
      <nav className="relative z-10 px-8 py-6 flex justify-between items-center backdrop-blur-sm border-b border-gold-500/10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 text-transparent bg-clip-text">
            PerBillion
          </h1>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex gap-4"
        >
          <Link to="/login">
            <button className="px-6 py-2.5 text-gold-400 hover:text-gold-300 font-medium transition-colors">
              Sign In
            </button>
          </Link>
          <Link to="/register">
            <button className="px-6 py-2.5 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-lg hover:from-gold-400 hover:to-gold-500 transform hover:scale-105 transition-all shadow-lg hover:shadow-gold-500/50">
              Get Started
            </button>
          </Link>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="inline-block mb-6"
          >
            <span className="px-4 py-2 bg-gold-500/10 border border-gold-500/30 rounded-full text-gold-400 text-sm font-medium backdrop-blur-sm">
              Wall Street Intelligence
            </span>
          </motion.div>
          
          <h2 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-gold-100 to-white text-transparent bg-clip-text">
              Predict the Future
            </span>
            <br />
            <span className="bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 text-transparent bg-clip-text">
              With Precision
            </span>
          </h2>
          
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Advanced AI-powered forecasting and financial education platform. 
            Master the markets with institutional-grade analytics and expert-curated learning paths.
          </p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex gap-6 justify-center"
          >
            <Link to="/register">
              <button className="px-8 py-4 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-bold text-lg rounded-xl hover:from-gold-400 hover:to-gold-500 transform hover:scale-105 transition-all shadow-2xl hover:shadow-gold-500/50">
                Start Forecasting
              </button>
            </Link>
            <Link to="/login">
              <button className="px-8 py-4 bg-black/40 text-gold-400 font-semibold text-lg rounded-xl border-2 border-gold-500/30 hover:border-gold-500 hover:bg-black/60 backdrop-blur-sm transition-all">
                Sign In
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="grid md:grid-cols-3 gap-8 mt-24"
        >
          {/* Feature 1 */}
          <motion.div
            whileHover={{ y: -8 }}
            className="premium-border-wrapper cursor-pointer"
          >
            <div className="premium-card-inner h-full">
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-500/20 to-gold-600/20 flex items-center justify-center mb-6 border border-gold-500/30">
                  <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gold-400 mb-3">AI Forecasting</h3>
                <p className="text-gray-400 leading-relaxed">
                  State-of-the-art time series models powered by advanced machine learning algorithms
                </p>
              </div>
            </div>
          </motion.div>

          {/* Feature 2 */}
          <motion.div
            whileHover={{ y: -8 }}
            className="premium-border-wrapper cursor-pointer"
          >
            <div className="premium-card-inner h-full">
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-500/20 to-gold-600/20 flex items-center justify-center mb-6 border border-gold-500/30">
                  <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gold-400 mb-3">Expert Education</h3>
                <p className="text-gray-400 leading-relaxed">
                  Curated learning paths from foundation to elite level trading strategies
                </p>
              </div>
            </div>
          </motion.div>

          {/* Feature 3 */}
          <motion.div
            whileHover={{ y: -8 }}
            className="premium-border-wrapper cursor-pointer"
          >
            <div className="premium-card-inner h-full">
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-500/20 to-gold-600/20 flex items-center justify-center mb-6 border border-gold-500/30">
                  <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gold-400 mb-3">Real-Time Analytics</h3>
                <p className="text-gray-400 leading-relaxed">
                  Live market data integration with institutional-grade analysis tools
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10 border-t border-gold-500/10 py-8">
        <div className="max-w-7xl mx-auto px-8 text-center text-gray-500 text-sm">
          <p>&copy; 2025 PerBillion. Elite financial intelligence platform.</p>
        </div>
      </div>
    </div>
  )
}
