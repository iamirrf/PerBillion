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
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PublicRoute>
            <motion.div
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageVariants}
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
              exit="exit"
              variants={pageVariants}
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
              exit="exit"
              variants={pageVariants}
            >
              <Register />
            </motion.div>
          </PublicRoute>
        } />
        <Route path="/home" element={
          <PrivateRoute>
            <Layout>
              <motion.div
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
              >
                <HomeDashboard />
              </motion.div>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/dashboard" element={<Navigate to="/home" />} />
        <Route path="/forecast" element={
          <PrivateRoute>
            <Layout>
              <motion.div
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
              >
                <ForecastDashboard />
              </motion.div>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/education" element={
          <PrivateRoute>
            <Layout>
              <motion.div
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
              >
                <Education />
              </motion.div>
            </Layout>
          </PrivateRoute>
        } />
        <Route path="/profile" element={
          <PrivateRoute>
            <Layout>
              <motion.div
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageVariants}
              >
                <Profile />
              </motion.div>
            </Layout>
          </PrivateRoute>
        } />
      </Routes>
    </AnimatePresence>
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
      <AnimatedRoutes />
    </Router>
  )
}

export default App

