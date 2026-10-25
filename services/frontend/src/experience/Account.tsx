import { FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useLearningStore } from './learningStore'
import { lessons } from './curriculum'

function Arrow() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>
}

function Eye({ visible }: { visible: boolean }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{!visible && <path d="m3 3 18 18" />}</svg>
}

function errorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback
  if (!error.response) return 'We couldn’t connect to the account service. Please try again.'
  const data = error.response.data
  if (typeof data?.error === 'string') return data.error
  if (Array.isArray(data?.errors) && data.errors[0]?.msg) return String(data.errors[0].msg)
  if (error.response.status === 429) return 'Too many attempts. Please wait a moment and try again.'
  return fallback
}

function PasswordField({ id, label, value, onChange, creating = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void; creating?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return <div className="account-field">
    <label htmlFor={id}>{label}</label>
    <div className="account-password">
      <input id={id} type={visible ? 'text' : 'password'} autoComplete={creating ? 'new-password' : 'current-password'} required minLength={creating ? 8 : undefined} maxLength={128} value={value} onChange={event => onChange(event.target.value)} placeholder={creating ? 'At least 8 characters' : 'Enter your password'} />
      <button className="account-eye" type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)}><Eye visible={visible} /></button>
    </div>
  </div>
}

function AuthPage({ creating }: { creating: boolean }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState(() => { try { if (!creating && sessionStorage.getItem('perbillion-session-expired')) { sessionStorage.removeItem('perbillion-session-expired'); return 'Your session expired. Sign in again to continue where you left off.' } } catch { /* Ignore unavailable session storage. */ } return '' })
  const [submitting, setSubmitting] = useState(false)
  const setAuth = useAuthStore(state => state.setAuth)
  const token = useAuthStore(state => state.token)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setError('')
    if (creating && password !== confirmation) { setError('Your passwords don’t match. Please try again.'); return }
    if (creating && !name.trim()) { setError('Please enter your name.'); return }
    if (creating && new TextEncoder().encode(password).length > 72) { setError('Please use a password of 72 bytes or fewer.'); return }
    setSubmitting(true)
    try {
      const response = await api.post(`/auth/${creating ? 'register' : 'login'}`, {
        email: email.trim(), password, ...(creating ? { fullName: name.trim() } : {}),
      })
      if (!response.data?.token || !response.data?.user) throw new Error('Invalid account response')
      setAuth(response.data.user, response.data.token)
      const requested = params.get('returnTo')
      const destination = requested?.startsWith('/app') && !requested.startsWith('//') ? requested : (creating ? '/app/onboarding' : '/app')
      navigate(destination, { replace: true })
    } catch (failure) {
      setError(errorMessage(failure, creating ? 'We couldn’t create your account. Please try again.' : 'We couldn’t sign you in. Please check your details.'))
    } finally { setSubmitting(false) }
  }

  return <div className="account-auth">
    <aside className="account-story">
      <div className="account-story-top"><span className="eyebrow">A better way to understand money</span><span className="account-story-index">01 — ∞</span></div>
      <div className="account-story-art" aria-hidden="true"><span/><span/><span/></div>
      <div className="account-story-copy"><h2>Invest in<br />your understanding.</h2><p>Small lessons. Clearer thinking.<br />A lifetime of better decisions.</p></div>
      <div className="account-story-bottom"><span>Free to learn. Built for curiosity.</span><span>PERBILLION</span></div>
    </aside>
    <section className="account-auth-main" aria-labelledby="account-auth-title">
      <Link to="/" className="account-back"><span aria-hidden="true">←</span> Back home</Link>
      <div className="account-auth-inner">
        <span className="eyebrow">{creating ? 'Your next chapter' : 'Keep your momentum'}</span>
        <h1 id="account-auth-title">{creating ? 'Start with curiosity.' : 'Welcome back.'}</h1>
        <p className="muted">{creating ? 'Create your free PerBillion account.' : 'Sign in to your PerBillion account.'}</p>
        {token ? <div className="account-already panel"><p>You’re already signed in.</p><Link className="button button-gold" to="/app/account">Go to your account <Arrow /></Link></div> : <form onSubmit={submit} className="account-auth-form">
          {error && <p className="account-message account-error" role="alert">{error}</p>}
          {creating && <div className="account-field"><label htmlFor="auth-name">Full name</label><input id="auth-name" autoComplete="name" required maxLength={80} placeholder="Your name" value={name} onChange={event => setName(event.target.value)} /></div>}
          <div className="account-field"><label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} /></div>
          <PasswordField id="auth-password" label="Password" value={password} onChange={setPassword} creating={creating} />
          {creating && <PasswordField id="auth-confirm" label="Confirm password" value={confirmation} onChange={setConfirmation} creating />}
          <button className="button button-gold account-submit" type="submit" disabled={submitting}>{submitting ? (creating ? 'Creating your account…' : 'Signing in…') : (creating ? 'Create free account' : 'Sign in')} {!submitting && <Arrow />}</button>
          <p className="account-auth-switch">{creating ? 'Already have an account?' : 'New to PerBillion?'} <Link to={creating ? '/login' : '/register'}>{creating ? 'Sign in' : 'Create an account'}</Link></p>
        </form>}
        <p className="account-auth-note">Every lesson and interactive lab is free.<br />No card. No subscription.</p>
      </div>
    </section>
  </div>
}

export function Login() { return <AuthPage creating={false} /> }
export function Register() { return <AuthPage creating /> }

interface Preferences {
  defaultTicker: string
  defaultForecastHorizon: number
  advancedModeEnabled: boolean
  preferredModel: string
  theme: string
}
const defaultPreferences: Preferences = { defaultTicker: 'AAPL', defaultForecastHorizon: 12, advancedModeEnabled: false, preferredModel: 'auto', theme: 'light' }
const preferenceKey = 'perbillion-preferences-v2'
const supportedModels = new Set(['auto', 'ARIMA', 'SARIMA', 'SARIMAX', 'HOLT_WINTERS_ADDITIVE', 'HOLT_WINTERS_MULTIPLICATIVE', 'HOLT_WINTERS_DAMPED'])

function initialPreferences(): Preferences {
  try {
    const data = JSON.parse(localStorage.getItem(preferenceKey) || '{}')
    if (!data || typeof data !== 'object') return defaultPreferences
    return {
      ...defaultPreferences,
      ...(typeof data.defaultTicker === 'string' && /^[A-Z]{1,5}$/.test(data.defaultTicker) ? { defaultTicker: data.defaultTicker } : {}),
      ...(Number.isInteger(data.defaultForecastHorizon) && data.defaultForecastHorizon >= 1 && data.defaultForecastHorizon <= 52 ? { defaultForecastHorizon: data.defaultForecastHorizon } : {}),
      ...(supportedModels.has(data.preferredModel) ? { preferredModel: data.preferredModel } : {}),
      ...(typeof data.advancedModeEnabled === 'boolean' ? { advancedModeEnabled: data.advancedModeEnabled } : {}),
    }
  }
  catch { return defaultPreferences }
}

function savedMotion() {
  try {
    const saved = localStorage.getItem('perbillion-reduced-motion')
    return saved === null ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : saved === 'true'
  }
  catch { return false }
}

export function Profile() {
  const { user, token, updateUser, logout } = useAuthStore()
  const completed = useLearningStore(state => state.completed)
  const resetProgress = useLearningStore(state => state.resetProgress)
  const syncStatus = useLearningStore(state => state.syncStatus)
  const synchronize = useLearningStore(state => state.synchronize)
  const [name, setName] = useState(user?.fullName || '')
  const [username, setUsername] = useState(user?.username || '')
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences)
  const [reducedMotion, setReducedMotion] = useState(savedMotion)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [legacy, setLegacy] = useState<Array<{ id: string; title: string; score: number }>>([])
  const [legacyUnavailable, setLegacyUnavailable] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    setLoading(true)
    Promise.allSettled([
      api.get('/user/profile', { signal: controller.signal }),
      api.get('/user/preferences', { signal: controller.signal }),
    ]).then(results => {
      if (controller.signal.aborted) return
      const [profile, prefs] = results
      if (profile.status === 'fulfilled') {
        updateUser(profile.value.data)
        setName(profile.value.data.fullName || '')
        setUsername(profile.value.data.username || '')
      } else setError(errorMessage(profile.reason, 'We couldn’t refresh your account. Your saved details are shown.'))
      if (prefs.status === 'fulfilled') {
        const data = prefs.value.data || {}
        const next: Preferences = {
          ...initialPreferences(),
          ...(typeof data.defaultTicker === 'string' && /^[A-Z]{1,5}$/.test(data.defaultTicker) ? { defaultTicker: data.defaultTicker } : {}),
          ...(Number.isInteger(data.defaultForecastHorizon) && data.defaultForecastHorizon >= 1 && data.defaultForecastHorizon <= 52 ? { defaultForecastHorizon: data.defaultForecastHorizon } : {}),
          ...(typeof data.advancedModeEnabled === 'boolean' ? { advancedModeEnabled: data.advancedModeEnabled } : {}),
          ...(supportedModels.has(data.preferredModel) ? { preferredModel: data.preferredModel } : {}),
        }
        setPreferences(next)
        try { localStorage.setItem(preferenceKey, JSON.stringify(next)) } catch { /* Preferences remain available for this session. */ }
      }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token, updateUser])

  useEffect(() => {
    if (!token) { setLegacy([]); setLegacyUnavailable(false); return }
    const controller = new AbortController()
    Promise.all([
      api.get('/education/progress', { signal: controller.signal }),
      api.get('/education/lessons', { signal: controller.signal }),
    ]).then(([progress, catalog]) => {
      if (controller.signal.aborted) return
      const titles = new Map<string, string>((catalog.data.lessons || []).map((item: { lessonId: string; title: string }) => [item.lessonId, item.title]))
      setLegacy((progress.data.progress?.completedLessons || []).map((item: { lessonId: string; quizScore: number }) => ({
        id: item.lessonId, title: titles.get(item.lessonId) || item.lessonId, score: item.quizScore,
      })))
      setLegacyUnavailable(false)
    }).catch(() => { if (!controller.signal.aborted) setLegacyUnavailable(true) })
    return () => controller.abort()
  }, [token])

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    if (!token || saving) return
    if (!name.trim()) { setError('Please enter your name.'); return }
    setSaving(true); setError(''); setMessage('')
    try {
      const response = await api.put('/user/profile', { fullName: name.trim(), username: username.trim() || null })
      updateUser(response.data)
      setMessage('Your profile has been updated.')
    } catch (failure) { setError(errorMessage(failure, 'We couldn’t save your profile. Please try again.')) }
    finally { setSaving(false) }
  }

  async function uploadPicture(file: File | undefined) {
    if (!file || !token) return
    setError(''); setMessage('')
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) { setError('Choose a JPG, PNG, GIF, or WebP image.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Choose an image smaller than 5 MB.'); return }
    setUploading(true)
    try {
      const body = new FormData(); body.append('profilePicture', file)
      const response = await api.post('/user/profile-picture', body, { headers: { 'Content-Type': 'multipart/form-data' } })
      updateUser({ profilePicture: response.data.profilePicture })
      setMessage('Your profile photo has been updated.')
    } catch (failure) { setError(errorMessage(failure, 'We couldn’t upload your image. Please try again.')) }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = '' }
  }

  async function savePreferences(event: FormEvent) {
    event.preventDefault()
    setSavingPreferences(true); setError(''); setMessage('')
    const next = { ...preferences, defaultTicker: preferences.defaultTicker.trim().toUpperCase(), theme: 'light' }
    try {
      if (token) await api.put('/user/preferences', next)
      let stored = true
      try { localStorage.setItem(preferenceKey, JSON.stringify(next)) } catch { stored = false }
      setPreferences(next)
      window.dispatchEvent(new CustomEvent('perbillion-preferences-change', { detail: next }))
      setMessage(token ? 'Your lab preferences have been saved.' : stored ? 'Your lab preferences have been saved on this device.' : 'Preferences applied for this session. Browser storage is unavailable.')
    } catch (failure) { setError(errorMessage(failure, 'We couldn’t save your lab preferences. Please try again.')) }
    finally { setSavingPreferences(false) }
  }

  function changeMotion() {
    const next = !reducedMotion
    setReducedMotion(next)
    try { localStorage.setItem('perbillion-reduced-motion', String(next)) } catch { /* The preference still applies to the current session. */ }
    document.documentElement.dataset.reducedMotion = String(next)
    document.documentElement.dataset.reduceMotion = String(next)
    window.dispatchEvent(new CustomEvent('perbillion-motion-change', { detail: next }))
    window.dispatchEvent(new CustomEvent('perbillion-motion', { detail: next }))
  }

  async function exportProgress() {
    setError(''); setMessage('Preparing your export…')
    const product = token ? await Promise.allSettled([
      api.get('/product/practice?scenario=steady-growth'), api.get('/product/practice?scenario=rate-shock'), api.get('/product/practice?scenario=selloff-recovery'),
      api.get('/product/watchlist'), api.get('/product/comparisons'), api.get('/forecast/history?limit=100'), api.get('/education/v2/exercises'),
    ]) : []
    const values = product.map(item => item.status === 'fulfilled' ? item.value.data : null)
    const content = { version: 3, exportedAt: new Date().toISOString(), profile: user ? { id: user.id, email: user.email, fullName: user.fullName, username: user.username } : null, completedLessons: completed, completedExercises: values[6]?.completed || {}, priorCoursework: legacy, syncStatus, preferences, reducedMotion, practiceScenarios: values.slice(0, 3), watchlist: values[3] || null, researchComparisons: values[4] || null, forecastHistory: values[5] || null }
    const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'perbillion-account-export.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMessage('Your account export is ready.')
  }

  async function confirmProgressReset() {
    if (resetting) return
    setResetting(true); setError(''); setMessage('')
    try {
      await resetProgress()
      setConfirmReset(false)
      setMessage(token ? 'Your current curriculum progress was reset on this device and in your account.' : 'Your learning progress was reset on this device.')
    } catch (failure) {
      setError(errorMessage(failure, 'Your account progress could not be reset. Please try again.'))
    } finally { setResetting(false) }
  }

  const completions = Object.values(completed)
  const average = completions.length ? Math.round(completions.reduce((sum, item) => sum + item.score, 0) / completions.length) : 0
  const monogram = (user?.fullName || 'Guest').split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
  const uploadedPhoto = user?.profilePicture?.startsWith('/uploads/') ? user.profilePicture : undefined

  return <div className="account-page">
    <div className="account-page-heading"><div><span className="eyebrow">Make it your own</span><h1 className="page-heading">Your workspace.</h1><p className="muted">A little progress, every day.</p></div><span className="pill">{token ? 'Free account' : 'Guest workspace'}</span></div>
    <div className="account-feedback" aria-live="polite">{error ? <p role="alert" className="account-message account-error">{error}</p> : message ? <p className="account-message account-success" role="status">{message}</p> : null}</div>
    <div className="account-profile-layout">
      <div className="account-profile-main">
        <section className="panel account-profile-card" aria-labelledby="profile-title">
          <div className="account-section-heading"><span className="eyebrow">01 / Profile</span>{loading && <span className="muted">Refreshing…</span>}</div>
          <div className="account-identity"><div className="account-avatar">{uploadedPhoto ? <img src={uploadedPhoto} alt="Your profile" /> : monogram}</div><div><h2 id="profile-title">{token ? user?.fullName || 'Your profile' : 'Hello, curious mind.'}</h2><p className="muted">{token ? user?.email : 'Your learning journey starts right here.'}</p></div></div>
          {token ? <form onSubmit={saveProfile}>
            <div className="account-form-grid"><div className="account-field"><label htmlFor="profile-name">Full name</label><input id="profile-name" disabled={loading} autoComplete="name" value={name} required maxLength={80} onChange={event => setName(event.target.value)} /></div><div className="account-field"><label htmlFor="profile-username">Username <span className="muted">optional</span></label><input id="profile-username" disabled={loading} autoComplete="username" value={username} pattern="[a-zA-Z0-9_]{3,30}" title="3–30 letters, numbers, or underscores" maxLength={30} onChange={event => setUsername(event.target.value)} /></div></div>
            <div className="account-profile-actions"><button className="button button-gold" type="submit" disabled={saving || loading}>{saving ? 'Saving…' : 'Save profile'} <Arrow /></button><button className="button button-ghost" type="button" disabled={uploading || loading} onClick={() => fileInput.current?.click()}>{uploading ? 'Uploading…' : 'Change photo'}</button><input ref={fileInput} className="account-hidden" type="file" accept="image/jpeg,image/png,image/gif,image/webp" aria-label="Upload profile photo" onChange={event => uploadPicture(event.target.files?.[0])} /></div>
          </form> : <div className="account-guest-profile"><p className="muted">Explore every lesson and lab. Your learning progress stays in this browser.</p><Link to="/register" className="button button-gold">Create free account <Arrow /></Link><Link className="account-text-link" to="/login">Already a member? Sign in</Link></div>}
        </section>

        <section className="panel account-profile-card" aria-labelledby="preferences-title"><div className="account-section-heading"><span className="eyebrow">02 / Your environment</span></div><h2 id="preferences-title">Built around you.</h2><div className="account-setting-row"><div><h3>Reduced motion</h3><p className="muted">A quieter experience with less animation.</p></div><button type="button" className={`account-toggle ${reducedMotion ? 'is-on' : ''}`} role="switch" aria-checked={reducedMotion} aria-label="Reduced motion" onClick={changeMotion}><span /></button></div>
          <form onSubmit={savePreferences} className="account-preferences"><div className="account-form-grid"><div className="account-field"><label htmlFor="default-ticker">Default ticker</label><input id="default-ticker" disabled={loading} value={preferences.defaultTicker} maxLength={5} required pattern="[A-Z]{1,5}" onChange={event => setPreferences({ ...preferences, defaultTicker: event.target.value.toUpperCase() })} /></div><div className="account-field"><label htmlFor="default-horizon">Forecast horizon · weeks</label><input id="default-horizon" type="number" min="1" max="52" step="1" disabled={loading} value={preferences.defaultForecastHorizon} required onChange={event => setPreferences({ ...preferences, defaultForecastHorizon: Number(event.target.value) })} /></div><div className="account-field"><label htmlFor="preferred-model">Preferred model</label><select id="preferred-model" disabled={loading} value={preferences.preferredModel} onChange={event => setPreferences({ ...preferences, preferredModel: event.target.value })}><option value="auto">Automatic selection</option><option value="ARIMA">ARIMA</option><option value="SARIMA">SARIMA</option><option value="SARIMAX">SARIMAX</option><option value="HOLT_WINTERS_ADDITIVE">Holt-Winters additive</option><option value="HOLT_WINTERS_MULTIPLICATIVE">Holt-Winters multiplicative</option><option value="HOLT_WINTERS_DAMPED">Holt-Winters damped</option></select></div></div><button className="button button-ghost" type="submit" disabled={savingPreferences || loading}>{savingPreferences ? 'Saving…' : 'Save lab preferences'} <Arrow /></button></form>
        </section>

        {token && <section className="panel account-profile-card account-legacy" aria-labelledby="prior-coursework-title"><span className="eyebrow">PRIOR COURSEWORK</span><h2 id="prior-coursework-title">Your earlier lessons.</h2><p className="muted">Your previous curriculum stays in your transcript. Its completions are separate from the current learning path.</p>{legacyUnavailable ? <p className="account-legacy-state">Your earlier coursework is temporarily unavailable.</p> : legacy.length ? <div className="account-legacy-list">{legacy.map(item => <div key={item.id}><span>{item.title}</span><strong>{item.score}%</strong></div>)}</div> : <p className="account-legacy-state">No earlier lessons completed.</p>}</section>}
      </div>
      <aside className="account-profile-sidebar">
        <section className="panel account-progress-card" aria-labelledby="progress-title"><span className="eyebrow">Your learning, in focus</span><h2 id="progress-title">Forward is forward.</h2><div className="account-progress-ring"><svg viewBox="0 0 160 160" aria-label={`${completions.length} of ${lessons.length} lessons completed`} role="img"><circle cx="80" cy="80" r="66" fill="none" stroke="#e1e4eb" strokeWidth="5" /><circle cx="80" cy="80" r="66" fill="none" stroke="#245bff" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${Math.min(completions.length / lessons.length, 1) * 414.69} 414.69`} transform="rotate(-90 80 80)" /></svg><div><strong>{completions.length}<span>/{lessons.length}</span></strong><span>lessons completed</span></div></div><dl className="account-learning-stats"><div><dt>Average quiz score</dt><dd>{completions.length ? `${average}%` : '—'}</dd></div><div><dt>Progress storage</dt><dd>{token ? syncStatus === 'synced' ? 'Synced to account' : syncStatus === 'offline' ? 'On device · sync pending' : 'Syncing…' : 'On this device'}</dd></div></dl>{token && syncStatus === 'offline' && <button className="account-text-link account-sync-retry" onClick={() => void synchronize()}>Retry account sync</button>}<Link className="button button-gold" to="/app/learn">Keep learning <Arrow /></Link></section>
        <section className="panel account-data-card"><span className="eyebrow">03 / Your data</span><h2>Always yours.</h2><p className="muted">Download your profile, learning, practice, watchlist, and saved research data.</p><button className="button button-ghost" onClick={()=>void exportProgress()}>Export account data <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" /></svg></button><div className="account-reset">{confirmReset ? <div><p>{token ? 'Reset current learning progress on this device and in your account? Prior coursework will remain.' : 'Reset current lesson completions on this device?'}</p><div className="account-reset-actions"><button type="button" className="account-danger" disabled={resetting} onClick={() => void confirmProgressReset()}>{resetting ? 'Resetting…' : 'Yes, reset progress'}</button><button type="button" className="account-text-link" onClick={() => setConfirmReset(false)}>Keep progress</button></div></div> : <button type="button" className="account-text-link" onClick={() => setConfirmReset(true)}>Reset learning progress</button>}</div></section>
        {token && <button type="button" className="button button-ghost account-signout" onClick={() => { logout(); navigate('/'); }}>Sign out <Arrow /></button>}
      </aside>
    </div>
  </div>
}
