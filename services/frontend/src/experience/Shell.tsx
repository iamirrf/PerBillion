import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { lessons } from './curriculumCatalog'
import { Brand, Icon } from './Icons'

const navigation = [
  ['/app', 'home', 'Overview'],
  ['/app/learn', 'book', 'Learn'],
  ['/app/missions', 'check', 'Missions'],
  ['/app/practice/portfolio', 'chart', 'Practice'],
  ['/app/research', 'spark', 'Research'],
  ['/app/progress', 'progress', 'Progress'],
]

export default function Shell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  const [mobile, setMobile] = useState(false)
  const [search, setSearch] = useState(false)
  const [query, setQuery] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const searchTrigger = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLElement>(null)
  const mobileDialog = useRef<HTMLElement>(null)
  const mobileTrigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMobile(false)
    setSearch(false)
    document.getElementById('main-content')?.focus()
  }, [location.pathname])

  useEffect(() => {
    if (search) input.current?.focus()
  }, [search])

  useEffect(() => {
    if (!mobile) return
    mobileDialog.current?.querySelector<HTMLElement>('a,button')?.focus()
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMobile(false); mobileTrigger.current?.focus() } }
    addEventListener('keydown', close)
    return () => removeEventListener('keydown', close)
  }, [mobile])

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearch(true)
      }
      if (event.key === 'Escape' && search) {
        setSearch(false)
        searchTrigger.current?.focus()
      }
    }
    addEventListener('keydown', shortcut)
    return () => removeEventListener('keydown', shortcut)
  }, [search])

  function trapFocus(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return
    const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled])')
    if (!controls?.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  async function signOut() {
    try { await api.post('/auth/logout') } catch { /* Local state must still be cleared. */ }
    logout()
    navigate('/')
  }

  const results = lessons
    .filter(lesson => `${lesson.title} ${lesson.description} ${lesson.track}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8)

  return <div className="workspace">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside ref={mobileDialog} className={mobile ? 'app-sidebar open' : 'app-sidebar'} role={mobile ? 'dialog' : undefined} aria-modal={mobile || undefined} aria-label={mobile ? 'Workspace navigation' : undefined}>
      <Link to="/" className="app-brand"><Brand /></Link>
      <nav>{navigation.map(([to, icon, label]) =>
        <NavLink end={to === '/app'} to={to} key={to}><Icon name={icon} /><span>{label}</span></NavLink>
      )}</nav>
      <div className="sidebar-grow"><span>ACADEMY MEMBERSHIP</span><p>Learn the idea.<br />Practice the decision.</p><NavLink to="/app/billing">Membership & billing</NavLink></div>
      <NavLink className="account-link" to="/app/account">
        <span className="avatar">{user?.fullName?.[0]?.toUpperCase()}</span>
        <span>{user?.fullName?.split(' ')[0]}<small>Account & data</small></span><Icon name="chevron" size={16} />
      </NavLink>
    </aside>
    {mobile && <button className="app-scrim" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <div className="workspace-main">
      <header className="app-topbar">
        <button ref={mobileTrigger} className="mobile-trigger" onClick={() => setMobile(true)} aria-label="Open navigation" aria-expanded={mobile}><Icon name="menu" /></button>
        <span>{navigation.find(([to]) => to === '/app' ? location.pathname === '/app' : location.pathname.startsWith(to))?.[2] || 'Workspace'}</span>
        <button ref={searchTrigger} className="app-search" onClick={() => setSearch(true)}><Icon name="search" size={16} /><span>Find a lesson</span><kbd>⌘ K</kbd></button>
        <Link to="/app/account" className="top-avatar" aria-label="Open account settings">{user?.fullName?.[0]?.toUpperCase()}</Link>
      </header>
      <main id="main-content" className="workspace-content" tabIndex={-1}>{children}</main>
    </div>
    {search && <div className="search-overlay" onMouseDown={event => { if (event.currentTarget === event.target) { setSearch(false); searchTrigger.current?.focus() } }}>
      <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby="lesson-search-title" onKeyDown={trapFocus}>
        <h2 id="lesson-search-title" className="sr-only">Search lessons</h2>
        <div><Icon name="search" /><input ref={input} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search risk, portfolios, models…" /><button onClick={() => { setSearch(false); searchTrigger.current?.focus() }} aria-label="Close search"><Icon name="close" /></button></div>
        {results.map(lesson => <Link key={lesson.id} to={`/app/learn/${lesson.id}`}><span>{lesson.title}<small>{lesson.duration} min · {lesson.track}</small></span><Icon name="arrow" /></Link>)}
        {!results.length && <p className="search-empty">No lesson matches “{query}”. Try a broader concept.</p>}
        <footer><button onClick={() => void signOut()}>Sign out</button></footer>
      </section>
    </div>}
  </div>
}
