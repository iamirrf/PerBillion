import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

interface EducationStats {
  totalLessons: number
  completedCount: number
  currentLevel: string
  completionPercentage: number
  totalTimeSpent: number
  recentLessons: any[]
  streakDays: number
}

interface EducationProgress {
  completedLessons: Array<{ lessonId: string; completedAt: string; quizScore: number }>
  quizScores: { [key: string]: number }
  streakDays: number
  totalTimeSpent: number
  badges: string[]
  currentLevel: string
}

export function Profile() {
  const { user, updateUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState(user?.username || '')
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<EducationStats | null>(null)
  const [progress, setProgress] = useState<EducationProgress | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const isMountedRef = useRef(true)
  const educationFetchInFlightRef = useRef(false)
  const lastEducationFetchAtRef = useRef(0)
  const educationRetryTimeoutRef = useRef<number | null>(null)
  const educationRateLimitHitsRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    fetchEducationData()
    return () => {
      isMountedRef.current = false
      if (educationRetryTimeoutRef.current) {
        window.clearTimeout(educationRetryTimeoutRef.current)
        educationRetryTimeoutRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchEducationData = async () => {
    // Avoid double-fetching in React.StrictMode and avoid overlapping calls
    if (educationFetchInFlightRef.current) return

    // Simple throttle to prevent hammering when other state changes cause re-renders
    const now = Date.now()
    if (now - lastEducationFetchAtRef.current < 2000) return
    lastEducationFetchAtRef.current = now

    setLoadingStats(true)
    educationFetchInFlightRef.current = true
    try {
      const [statsRes, progressRes] = await Promise.all([
        api.get('/education/stats'),
        api.get('/education/progress')
      ])
      educationRateLimitHitsRef.current = 0
      if (isMountedRef.current) {
        setStats(statsRes.data)
        setProgress(progressRes.data)
      }
    } catch (error: any) {
      const status = error?.response?.status
      if (status === 429) {
        // Back off on rate limit (prefer server hint)
        const retryAfterHeader = error?.response?.headers?.['retry-after']
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN
        const baseDelayMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 4000

        const hits = Math.min(6, educationRateLimitHitsRef.current + 1)
        educationRateLimitHitsRef.current = hits
        const delayMs = Math.min(60000, baseDelayMs * Math.pow(2, hits - 1))

        if (educationRetryTimeoutRef.current) {
          window.clearTimeout(educationRetryTimeoutRef.current)
        }

        educationRetryTimeoutRef.current = window.setTimeout(() => {
          if (isMountedRef.current) fetchEducationData()
        }, delayMs)
        return
      }

      console.error('Failed to fetch education data:', error)
    } finally {
      educationFetchInFlightRef.current = false
      if (isMountedRef.current) setLoadingStats(false)
    }
  }

  // Helper to get proper image URL
  const getImageUrl = (path: string | undefined) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    return `http://localhost:3000${path.startsWith('/') ? path : '/' + path}`
  }

  const handleProfilePictureUpload = async (file: File) => {
    if (!file) return
    
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('profilePicture', file)
      
      const response = await api.post('/user/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      updateUser({ profilePicture: response.data.profilePicture })
      alert('Profile picture updated successfully!')
    } catch (error: any) {
      console.error('Failed to upload profile picture:', error)
      alert(error.response?.data?.error || 'Failed to upload profile picture')
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const response = await api.put('/user/profile', {
        username: username || undefined,
        fullName: fullName || undefined,
      })
      
      updateUser({
        username: response.data.username,
        fullName: response.data.fullName,
      })
      
      setIsEditing(false)
      alert('Profile updated successfully!')
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      alert(error.response?.data?.error || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const getMonogram = () => {
    if (user?.fullName) {
      return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return user?.email?.[0].toUpperCase() || 'U'
  }

  const displayName = user?.username || user?.fullName || user?.email || 'User'

  return (
    <div className="w-full p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gold-400 to-amber-500 bg-clip-text text-transparent mb-2">
            My Profile
          </h1>
          <p className="text-gray-400 text-lg">Manage your account settings and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-black/40 backdrop-blur-xl border border-gold-500/20 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-start gap-8">
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                {user?.profilePicture ? (
                  <img 
                    src={getImageUrl(user.profilePicture)}
                    alt={displayName}
                    className="w-32 h-32 rounded-full object-cover border-4 border-gold-500/50 shadow-xl"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-black to-gray-900 border-4 border-gold-400 shadow-xl flex items-center justify-center text-4xl font-bold text-gold-400">
                    {getMonogram()}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-black"></div>
              </div>
              
              <label className="cursor-pointer px-6 py-3 bg-gradient-to-r from-gold-500/10 to-gold-600/10 hover:from-gold-500/20 hover:to-gold-600/20 text-gold-400 font-medium rounded-lg border border-gold-500/30 hover:border-gold-500/50 transition-all">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleProfilePictureUpload(file)
                    }
                  }} 
                />
                {uploading ? 'Uploading...' : 'Change Picture'}
              </label>
            </div>

            {/* Profile Information */}
            <div className="flex-1 space-y-6">
              {!isEditing ? (
                <>
                  {/* View Mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                    <p className="text-xl font-semibold text-white">{user?.fullName || 'Not set'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                    <p className="text-xl font-semibold text-white">{user?.username || 'Not set'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <p className="text-xl font-semibold text-white">{user?.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsEditing(true)
                      setUsername(user?.username || '')
                      setFullName(user?.fullName || '')
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <span>Edit Profile</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Edit Mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 bg-black/60 border border-gold-500/30 rounded-lg text-white focus:outline-none focus:border-gold-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                      className="w-full px-4 py-3 bg-black/60 border border-gold-500/30 rounded-lg text-white focus:outline-none focus:border-gold-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      className="w-full px-4 py-3 bg-black/20 border border-gold-500/20 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving || uploading}
                      className="px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-black font-semibold rounded-lg hover:from-gold-400 hover:to-gold-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setUsername(user?.username || '')
                        setFullName(user?.fullName || '')
                      }}
                      disabled={saving}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Learning Achievements Section */}
        <div className="mt-8 bg-black/40 backdrop-blur-xl border border-gold-500/20 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-gold-400 mb-6 flex items-center">
            <svg className="w-7 h-7 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Learning Achievements
          </h2>
          
          {loadingStats ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
              <p className="text-gray-400 mt-4">Loading your achievements...</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Completed Lessons */}
                <div className="bg-gradient-to-br from-gold-500/10 to-gold-600/5 border border-gold-500/30 rounded-xl p-6 transform hover:scale-105 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-4xl">📚</span>
                    <span className="text-2xl font-bold text-gold-400">
                      {stats?.completedCount || progress?.completedLessons?.length || 0}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-400">Lessons Completed</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats?.completionPercentage?.toFixed(0) || 0}% of all lessons
                  </p>
                </div>

                {/* Streak Days */}
                <div className="bg-gradient-to-br from-orange-500/10 to-red-600/5 border border-orange-500/30 rounded-xl p-6 transform hover:scale-105 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-4xl">🔥</span>
                    <span className="text-2xl font-bold text-orange-400">
                      {progress?.streakDays || stats?.streakDays || 0}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-400">Day Streak</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Keep learning daily!
                  </p>
                </div>

                {/* Total Time */}
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-6 transform hover:scale-105 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-4xl">⏱️</span>
                    <span className="text-2xl font-bold text-blue-400">
                      {Math.floor((progress?.totalTimeSpent || stats?.totalTimeSpent || 0) / 60)}h
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-400">Time Invested</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {(progress?.totalTimeSpent || stats?.totalTimeSpent || 0)} minutes total
                  </p>
                </div>

                {/* Current Level */}
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-6 transform hover:scale-105 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-4xl">🎯</span>
                    <span className="text-2xl font-bold text-purple-400 capitalize">
                      {progress?.currentLevel || stats?.currentLevel || 'Beginner'}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-400">Current Level</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Keep progressing!
                  </p>
                </div>
              </div>

              {/* Your Badges (moved from Education) */}
              {progress?.badges && progress.badges.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Your Badges ({progress.badges.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {progress.badges.map((badge, index) => (
                      <div
                        key={index}
                        className="bg-gradient-to-br from-gold-500/20 to-amber-600/20 rounded-xl p-4 border border-gold-400/30 text-center hover:scale-105 transition-transform"
                      >
                        <div className="text-4xl mb-2">
                          {badge.includes('streak') && '🔥'}
                          {badge.includes('first') && '🎯'}
                          {badge.includes('complete') && '✅'}
                          {badge.includes('perfect') && '💯'}
                          {badge === '5-lessons' && '⭐'}
                          {!badge.includes('streak') &&
                            !badge.includes('first') &&
                            !badge.includes('complete') &&
                            !badge.includes('perfect') &&
                            badge !== '5-lessons' &&
                            '🏆'}
                        </div>
                        <p className="text-xs text-gold-400 font-semibold uppercase">{badge.replace(/-/g, ' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {progress?.completedLessons && progress.completedLessons.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Completions</h3>
                  <div className="space-y-2">
                    {progress.completedLessons.slice(-5).reverse().map((lesson, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-black/30 border border-gold-500/10 rounded-lg p-3"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">📖</span>
                          <div>
                            <p className="text-sm font-medium text-white">Lesson {lesson.lessonId}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(lesson.completedAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                        {lesson.quizScore !== undefined && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-semibold text-gold-400">{lesson.quizScore}%</span>
                            {lesson.quizScore === 100 && <span className="text-xl">💯</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
