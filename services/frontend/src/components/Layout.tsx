import { useAuthStore } from '../store/authStore'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Helper to get proper image URL
  const getImageUrl = (path: string | undefined) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    return `/api${path.startsWith('/') ? path : '/' + path}`
  }

  const navItems = [
    { 
      path: '/home', 
      label: 'Home', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      path: '/forecast', 
      label: 'Forecast', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    { 
      path: '/education', 
      label: 'Education', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    { 
      path: '/profile', 
      label: 'Profile', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
  ]

  const displayName = user?.username || user?.fullName?.split(' ')[0] || 'User'
  const getMonogram = () => {
    if (user?.fullName) {
      return user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.[0].toUpperCase() || 'U';
  }

  return (
    <div className="h-screen overflow-hidden flex relative">
      
      
      {/* Sidebar Navigation */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} sticky top-0 h-screen overflow-hidden flex-shrink-0 relative z-10 flex flex-col border-r border-gold-500/20 backdrop-blur-xl bg-black/40 transition-all duration-300`}>
        {/* Logo and Collapse Button */}
        <div className="p-6 border-b border-gold-500/20 flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 text-transparent bg-clip-text">
                PerBillion
              </h1>
              <p className="text-xs text-gray-500 mt-1">Elite Trading Platform</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gold-500/10 rounded-lg transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>

        {/* Profile Section at Top */}
        {user && (
          <div className="p-4 border-b border-gold-500/20">
            <div className={`flex ${isCollapsed ? 'flex-col' : 'flex-row'} items-center ${isCollapsed ? 'text-center' : 'text-left'} p-3 rounded-xl bg-gradient-to-br from-gold-500/10 to-gold-600/10 border border-gold-500/30`}>
              <div className="relative">
                {user.profilePicture ? (
                  <img 
                    src={getImageUrl(user.profilePicture)}
                    alt={displayName}
                    className={`${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} rounded-full object-cover border-2 border-gold-500/50 shadow-lg cursor-pointer`}
                    onClick={() => navigate('/profile')}
                  />
                ) : (
                  <div 
                    className={`${isCollapsed ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-lg'} rounded-full bg-gradient-to-br from-black to-gray-900 border-2 border-gold-400 shadow-lg shadow-gold-500/30 flex items-center justify-center font-bold text-gold-400 cursor-pointer`}
                    onClick={() => navigate('/profile')}
                  >
                    {getMonogram()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
              </div>
              {!isCollapsed && (
                <div className="ml-3 flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gold-400 truncate">{displayName}</h3>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  <button
                    onClick={() => navigate('/profile')}
                    className="text-xs text-gold-400 hover:text-gold-300 mt-1 flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    View Profile
                  </button>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-gold-500/10 to-gold-600/10 hover:from-gold-500/20 hover:to-gold-600/20 text-gold-400 font-medium rounded-lg transition-all border border-gold-500/30 hover:border-gold-500/50 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            )}
            {isCollapsed && (
              <button
                onClick={handleLogout}
                className="w-full mt-3 p-2 bg-gradient-to-r from-gold-500/10 to-gold-600/10 hover:from-gold-500/20 hover:to-gold-600/20 text-gold-400 rounded-lg transition-all border border-gold-500/30 hover:border-gold-500/50 flex items-center justify-center"
                title="Sign Out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                            (item.path === '/home' && location.pathname === '/dashboard')
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg font-medium transition-all duration-300
                  ${isActive 
                    ? 'bg-gradient-to-r from-gold-500/20 to-gold-600/20 text-gold-400 border border-gold-500/40 shadow-lg shadow-gold-500/10' 
                    : 'text-gray-400 hover:text-gold-400 hover:bg-gold-500/10 border border-transparent'
                  }
                `}
                title={isCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>
      </aside>



      {/* Main Content */}
      <main className="flex-1 min-w-0 relative z-10 h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
