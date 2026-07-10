import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

interface QuickStats {
  forecastsGenerated: number
  lessonsCompleted: number
  currentStreak: number
  timeInvested: number
}

export function HomeDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [stats, setStats] = useState<QuickStats>({
    forecastsGenerated: 0,
    lessonsCompleted: 0,
    currentStreak: 0,
    timeInvested: 0,
  })
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    fetchQuickStats()
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchQuickStats = async () => {
    try {
      const [forecastRes, educationRes] = await Promise.all([
        api.get('/forecast/history').catch(() => ({ data: { forecasts: [] } })),
        api.get('/education/progress').catch(() => ({ data: { completedLessons: [], streakDays: 0, totalTimeSpent: 0 } }))
      ])
      
      setStats({
        forecastsGenerated: forecastRes.data.forecasts?.length || 0,
        lessonsCompleted: educationRes.data.completedLessons?.length || 0,
        currentStreak: educationRes.data.streakDays || 0,
        timeInvested: educationRes.data.totalTimeSpent || 0,
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  const getFirstName = () => {
    return user?.fullName?.split(' ')[0] || user?.username || 'Guest'
  }

  return (
    <div className="w-full">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gold-500/3 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-gold-500/5 to-transparent rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 pt-8">
          <div className="inline-block mb-6">
            <div className="text-6xl font-light text-white mb-2 tracking-tight">
              {getGreeting()}, <span className="text-gold-400 font-medium">{getFirstName()}</span>
            </div>
            <div className="flex items-center justify-center space-x-4 text-gray-400">
              <span className="text-sm font-light tracking-wide uppercase">
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-gold-500/50">•</span>
              <span className="font-mono text-sm">
                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto font-light leading-relaxed">
            Welcome to your exclusive portal. Where <span className="text-gold-400 italic">insight</span> meets <span className="text-gold-400 italic">opportunity</span>.
          </p>
        </div>

        {/* Quick Stats Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-2 border-gold-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {/* Forecasts Generated */}
              <div className="group relative bg-black/40 backdrop-blur-xl border border-gold-500/20 rounded-2xl p-6 hover:border-gold-500/50 transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gold-500/20 to-gold-600/10 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="text-4xl font-bold text-gold-400">{stats.forecastsGenerated}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Forecasts Generated</h3>
                </div>
              </div>

              {/* Lessons Completed */}
              <div className="group relative bg-black/40 backdrop-blur-xl border border-gold-500/20 rounded-2xl p-6 hover:border-gold-500/50 transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <span className="text-4xl font-bold text-emerald-400">{stats.lessonsCompleted}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Lessons Completed</h3>
                </div>
              </div>

              {/* Current Streak */}
              <div className="group relative bg-black/40 backdrop-blur-xl border border-gold-500/20 rounded-2xl p-6 hover:border-gold-500/50 transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">🔥</span>
                    </div>
                    <span className="text-4xl font-bold text-orange-400">{stats.currentStreak}</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Day Streak</h3>
                </div>
              </div>

              {/* Time Invested */}
              <div className="group relative bg-black/40 backdrop-blur-xl border border-gold-500/20 rounded-2xl p-6 hover:border-gold-500/50 transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-4xl font-bold text-blue-400">{Math.floor(stats.timeInvested / 60)}h</span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Time Invested</h3>
                </div>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              {/* Forecast Card */}
              <div 
                onClick={() => navigate('/forecast')}
                className="group relative bg-black/60 backdrop-blur-xl border border-gold-500/30 rounded-3xl p-8 cursor-pointer hover:border-gold-500/70 transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gold-500/10 via-transparent to-gold-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl transform translate-x-32 -translate-y-32 group-hover:scale-150 transition-transform duration-700"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-gold-500/30 to-gold-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                    </div>
                    <svg className="w-6 h-6 text-gold-500/50 group-hover:text-gold-400 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  
                  <h2 className="text-3xl font-light text-white mb-3">Generate Forecast</h2>
                  <p className="text-gray-400 leading-relaxed mb-4 font-light">
                    Harness advanced ML algorithms to predict market trends. Make informed decisions with precision analytics.
                  </p>
                  
                  <div className="flex items-center space-x-2 text-gold-400 font-medium">
                    <span className="text-sm uppercase tracking-wider">Access Forecasting</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Education Card */}
              <div 
                onClick={() => navigate('/education')}
                className="group relative bg-black/60 backdrop-blur-xl border border-gold-500/30 rounded-3xl p-8 cursor-pointer hover:border-gold-500/70 transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl transform translate-x-32 -translate-y-32 group-hover:scale-150 transition-transform duration-700"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <svg className="w-6 h-6 text-emerald-500/50 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  
                  <h2 className="text-3xl font-light text-white mb-3">Continue Learning</h2>
                  <p className="text-gray-400 leading-relaxed mb-4 font-light">
                    Elevate your expertise with curated lessons. Master financial strategies and unlock your potential.
                  </p>
                  
                  <div className="flex items-center space-x-2 text-emerald-400 font-medium">
                    <span className="text-sm uppercase tracking-wider">Enter Academy</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Quote Section */}
            <div className="bg-gradient-to-r from-black/40 via-gold-500/5 to-black/40 backdrop-blur-xl border border-gold-500/20 rounded-2xl p-8 text-center">
              <svg className="w-12 h-12 text-gold-500/30 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-xl md:text-2xl font-light text-gray-300 italic leading-relaxed mb-4">
                "In the realm of finance, knowledge is not just power—it is the currency of the elite."
              </p>
              <p className="text-sm text-gold-400 font-medium tracking-wider uppercase">PerBillion Philosophy</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
