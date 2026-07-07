import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { staggerContainer, staggerItem, errorShake } from '../utils/animations'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { email, password })
      setAuth(response.data.user, response.data.token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <motion.div 
        className="max-w-md w-full space-y-8"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        <motion.div className="text-center" variants={staggerItem}>
          <motion.h1 
            className="text-4xl font-bold bg-gradient-to-r from-gold-400 via-gold-500 to-gold-600 text-transparent bg-clip-text mb-2" 
            style={{ fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display' }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            PerBillion
          </motion.h1>
          <p className="text-gold-500 font-semibold">Institution-grade stock forecasting</p>
        </motion.div>

        <motion.form 
          onSubmit={handleSubmit} 
          className="bg-gradient-to-br from-gray-900/90 to-black/90 rounded-2xl border border-gold-500/30 p-8 backdrop-blur-xl shadow-2xl space-y-6"
          variants={staggerItem}
        >
          <h2 className="text-2xl font-semibold text-center text-gold-400">Sign in</h2>

          {error && (
            <motion.div 
              className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg"
              initial={{ opacity: 0, x: 0 }}
              animate={{ 
                opacity: 1,
                ...errorShake 
              }}
            >
              {error}
            </motion.div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gold-400 mb-2">
              Email
            </label>
            <motion.div
              animate={{
                scale: focusedField === 'email' ? 1.02 : 1,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <input
                id="email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                style={{
                  boxShadow: focusedField === 'email' 
                    ? '0 0 0 3px rgba(251, 191, 36, 0.2), 0 0 20px rgba(251, 191, 36, 0.1)' 
                    : undefined,
                  transition: 'box-shadow 0.2s ease'
                }}
              />
            </motion.div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gold-400 mb-2">
              Password
            </label>
            <motion.div
              animate={{
                scale: focusedField === 'password' ? 1.02 : 1,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <input
                id="password"
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                style={{
                  boxShadow: focusedField === 'password' 
                    ? '0 0 0 3px rgba(251, 191, 36, 0.2), 0 0 20px rgba(251, 191, 36, 0.1)' 
                    : undefined,
                  transition: 'box-shadow 0.2s ease'
                }}
              />
            </motion.div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full relative overflow-hidden"
            whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(251, 191, 36, 0.3)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <motion.span
              animate={loading ? { opacity: 0.7 } : { opacity: 1 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </motion.span>
            
            {/* Shine effect on hover */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: '-100%' }}
              whileHover={{ x: '100%' }}
              transition={{ duration: 0.6 }}
              style={{ pointerEvents: 'none' }}
            />
          </motion.button>

          <motion.p 
            className="text-center text-sm text-gold-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="text-gold-400 hover:text-gold-300 font-medium inline-block"
            >
              <motion.span
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block"
              >
                Sign up
              </motion.span>
            </Link>
          </motion.p>
        </motion.form>
      </motion.div>
    </div>
  )
}
