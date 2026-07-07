import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function Header() {
  const { user, logout } = useAuthStore()

  return (
    <header className="bg-black/90 backdrop-blur-lg border-b border-gold-500/30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link to="/dashboard" className="flex flex-col">
            <div className="text-2xl font-bold bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 text-transparent bg-clip-text animate-gradient tracking-tight">
              PerBillion
            </div>
          </Link>

          <nav className="flex items-center space-x-6">
            <Link 
              to="/dashboard" 
              className="text-gold-400 hover:text-gold-300 font-medium transition-all hover:scale-105"
            >
              Dashboard
            </Link>
            
            <div className="flex items-center space-x-4 pl-6 border-l border-gold-500/30">
              <span className="text-sm text-gold-500">{user?.email}</span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gradient-to-r from-gold-600 to-gold-700 text-black font-semibold rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all transform hover:scale-105 shadow-lg hover:shadow-gold-500/50"
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
