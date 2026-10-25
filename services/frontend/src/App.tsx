import { Component, type ReactNode, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Shell from './experience/Shell'
import Overview from './experience/Overview'
import Learn from './experience/Learn'
import Lab from './experience/Lab'
import Progress from './experience/Progress'
import { Login, Register, Profile } from './experience/Account'
import { useAuthStore } from './store/authStore'
import { useLearningStore } from './experience/learningStore'
import { lessons } from './experience/curriculum'
class ErrorBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div className="recovery"><span className="eyebrow">LET’S GET YOU BACK</span><h1>A fresh start.</h1><p>Your saved progress is still on this device.</p><button className="button button-gold" onClick={() => window.location.reload()}>Reload the experience</button></div>
    return this.props.children
  }
}
function RouteEffects() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo({top:0,behavior:'instant' as ScrollBehavior})
    const titles:Record<string,string>={'/':'Your investing journey','/home':'Your investing journey','/education':'The learning path','/forecast':'The practice lab','/quant':'AI & quantitative investing','/progress':'Your progress','/profile':'Your account','/login':'Welcome back','/register':'Create your account'}
    const descriptions:Record<string,string>={
      '/':'Learn investing from the beginning with interactive lessons, virtual trading, and quantitative research. Free at every level.',
      '/home':'Learn investing from the beginning with interactive lessons, virtual trading, and quantitative research. Free at every level.',
      '/education':'Follow 24 free, visual lessons from investing foundations through portfolios, trading, and quantitative research.',
      '/forecast':'Explore compound growth and place virtual trades with synthetic prices. Practice without real money.',
      '/quant':'Explore statistical forecasting and learn how quantitative researchers test ideas and handle uncertainty.',
      '/progress':'Review your current curriculum progress and continue your free investing education.',
      '/profile':'Manage your PerBillion account, learning progress, lab preferences, and data export.',
      '/login':'Sign in to synchronize your free PerBillion learning progress across devices.',
      '/register':'Create a free account to save your investing education progress across devices.',
    }
    const lessonId = pathname === '/education' ? new URLSearchParams(search).get('lesson') : null
    const lesson = lessons.find(item => item.id === lessonId)
    const title = `${lesson?.title || titles[pathname] || 'Explore'} · PerBillion`
    const description = lesson ? `${lesson.description} A free visual investing lesson from PerBillion.` : descriptions[pathname] || descriptions['/']
    document.title = title
    for (const [selector, value] of [['meta[name="description"]', description], ['meta[property="og:title"]', title], ['meta[property="og:description"]', description], ['meta[name="twitter:title"]', title], ['meta[name="twitter:description"]', description], ['meta[property="og:image"]', new URL('/assets/gold-sculpture.webp', window.location.origin).href], ['meta[name="twitter:image"]', new URL('/assets/gold-sculpture.webp', window.location.origin).href]]) {
      document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', value)
    }
  },[pathname, search])
  return null
}
function LearningConnection() {
  const accountId = useAuthStore(s => s.token ? s.user?.id || null : null)
  const epoch = useLearningStore(s => s.syncEpoch)
  const activate = useLearningStore(s => s.activateAccount)
  const synchronize = useLearningStore(s => s.synchronize)
  useEffect(() => { activate(accountId) }, [accountId, activate])
  useEffect(() => { if (accountId) void synchronize() }, [accountId, epoch, synchronize])
  useEffect(() => {
    const retry = () => { if (useAuthStore.getState().token) void useLearningStore.getState().synchronize() }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [])
  return null
}
export default function App() {
  useEffect(()=>{
    const apply=()=>{try{document.documentElement.dataset.reduceMotion=localStorage.getItem('perbillion-reduced-motion')==='true'?'true':'false'}catch{}}
    apply();window.addEventListener('storage',apply);window.addEventListener('perbillion-motion',apply)
    return()=>{window.removeEventListener('storage',apply);window.removeEventListener('perbillion-motion',apply)}
  },[])
  return <ErrorBoundary><BrowserRouter future={{v7_startTransition:true,v7_relativeSplatPath:true}}><LearningConnection/><RouteEffects/><Shell><Routes>
    <Route path="/" element={<Overview/>}/><Route path="/home" element={<Overview/>}/>
    <Route path="/dashboard" element={<Navigate to="/home" replace/>}/>
    <Route path="/education" element={<Learn/>}/><Route path="/forecast" element={<Lab/>}/>
    <Route path="/quant" element={<Lab quant/>}/><Route path="/progress" element={<Progress/>}/>
    <Route path="/profile" element={<Profile/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/>
    <Route path="*" element={<div className="empty-page"><span className="eyebrow">404 · A SMALL DETOUR</span><h1>Find your next step.</h1><p className="muted">This page has moved. Your journey is right here.</p><a className="button button-gold" href="/education">Explore the learning path →</a></div>}/>
  </Routes></Shell></BrowserRouter></ErrorBoundary>
}
