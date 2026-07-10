import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from './store/authStore'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForecastDashboard from './pages/ForecastDashboard'
import { HomeDashboard } from './pages/HomeDashboard'
import { Education } from './pages/Education'
import { Profile } from './pages/Profile'
import Layout from './components/Layout'
import AnimatedBackground from './components/AnimatedBackground'
import { pageVariants } from './utils/animations'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return token ? <>{children}</> : <Navigate to="/login" />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  return !token ? <>{children}</> : <Navigate to="/home" />
}

function AnimatedRoutes() {
  const location = useLocation()
  
  return (
    <Routes location={location}>
      <Route path="/" element={
        <PublicRoute>
          <motion.div
            initial="initial"
            animate="animate"
            variants={pageVariants}
            className="w-full"
          >
            <Home />
          </motion.div>
        </PublicRoute>
      } />
      <Route path="/login" element={
        <PublicRoute>
          <motion.div
            initial="initial"
            animate="animate"
            variants={pageVariants}
            className="w-full"
          >
            <Login />
          </motion.div>
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <motion.div
            initial="initial"
            animate="animate"
            variants={pageVariants}
            className="w-full"
          >
            <Register />
          </motion.div>
        </PublicRoute>
      } />
      <Route path="/home" element={
        <PrivateRoute>
          <motion.div
            initial="initial"
            animate="animate"
            variants={pageVariants}
            className="w-full"
          >
            <HomeDashboard />
          </motion.div>
        </PrivateRoute>
      } />
      <Route path="/dashboard" element={<Navigate to="/home" />} />
      <Route path="/forecast" element={
        <PrivateRoute>
          <motion.div
            initial="initial"
            animate="animate"
            variants={pageVariants}
            className="w-full"
          >
            <ForecastDashboard />
          </motion.div>
        </PrivateRoute>
      } />
      <Route path="/education" element={
        <PrivateRoute>
          <motion.div
            initial="initial"
            animate="animate"
            variants={pageVariants}
            className="w-full"
          >
            <Education />
          </motion.div>
        </PrivateRoute>
      } />
      <Route path="/profile" element={
        <PrivateRoute>
          <motion.div
            initial="initial"
            animate="animate"
            variants={pageVariants}
            className="w-full"
          >
            <Profile />
          </motion.div>
        </PrivateRoute>
      } />
    </Routes>
  )
}

function AppContent() {
  const { token, _hasHydrated } = useAuthStore()
  
  // Show a blank transparent screen until auth state hydrates to prevent FOUC / Pop-in
  if (!_hasHydrated) {
    return <div className="h-screen w-screen bg-transparent" />
  }
  
  return (
    <div className="h-screen overflow-hidden flex relative">
      {token && <Layout />}
      <main className="flex-1 min-w-0 relative z-10 h-screen overflow-y-auto">
        <AnimatedRoutes />
      </main>
    </div>
  )
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AnimatedBackground />
      <AppContent />
    </Router>
  )
}

export default App


