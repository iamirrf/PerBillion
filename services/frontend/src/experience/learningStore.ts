import { create } from 'zustand'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { lessons } from './curriculum'

export interface LessonCompletion { score: number; completedAt: string }
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline'
type CompletionMap = Record<string, LessonCompletion>
type Snapshot = { completed: CompletionMap; lastLesson: string | null }
interface LearningState extends Snapshot {
  accountId: string | null
  syncStatus: SyncStatus
  syncEpoch: number
  activateAccount: (id: string | null) => void
  completeLesson: (id: string, score: number) => void
  setLastLesson: (id: string) => void
  synchronize: () => Promise<void>
  resetProgress: () => Promise<void>
}
const guestKey = 'perbillion-learning-v2'
const validIds = new Set(lessons.map(lesson => lesson.id))
const accountKey = (id: string) => `perbillion-learning-account-v2-${encodeURIComponent(id)}`
const empty = (): Snapshot => ({ completed: {}, lastLesson: null })
function safeRead(key: string): Snapshot {
  try {
    const source = JSON.parse(localStorage.getItem(key) || 'null')?.state
    if (!source || typeof source.completed !== 'object' || Array.isArray(source.completed)) return empty()
    const completed: CompletionMap = {}
    for (const id of validIds) {
      const item = source.completed[id]
      if (item && Number.isInteger(item.score) && item.score >= 0 && item.score <= 100 &&
          typeof item.completedAt === 'string' && Number.isFinite(Date.parse(item.completedAt))) {
        completed[id] = { score: item.score, completedAt: item.completedAt }
      }
    }
    return { completed, lastLesson: validIds.has(source.lastLesson) ? source.lastLesson : null }
  } catch { return empty() }
}
function safeWrite(key: string, snapshot: Snapshot) {
  try { localStorage.setItem(key, JSON.stringify({ state: snapshot, version: 0 })) } catch { /* Progress remains usable this session. */ }
}
function safeRemove(key: string) { try { localStorage.removeItem(key) } catch {} }
function merge(a: CompletionMap, b: CompletionMap): CompletionMap {
  const result: CompletionMap = { ...a }
  for (const [id, item] of Object.entries(b)) {
    if (!validIds.has(id)) continue
    const prior = result[id]
    if (!prior) result[id] = item
    else result[id] = {
      score: Math.max(prior.score, item.score),
      completedAt: Date.parse(item.completedAt) < Date.parse(prior.completedAt) ? item.completedAt : prior.completedAt,
    }
  }
  return result
}
const signedInId = useAuthStore.getState().token ? useAuthStore.getState().user?.id || null : null
const guest = safeRead(guestKey)
const first = signedInId ? safeRead(accountKey(signedInId)) : guest
const starting: Snapshot = signedInId
  ? { completed: merge(first.completed, guest.completed), lastLesson: first.lastLesson || guest.lastLesson }
  : first
let inFlight: Promise<void> | null = null
let inFlightAccount: string | null = null

export const useLearningStore = create<LearningState>()((set, get) => ({
  ...starting,
  accountId: signedInId,
  syncStatus: signedInId ? 'syncing' : 'local',
  syncEpoch: signedInId ? 1 : 0,
  activateAccount: id => {
    const previous = get()
    if (id === previous.accountId) return
    if (previous.accountId) safeWrite(accountKey(previous.accountId), { completed: previous.completed, lastLesson: previous.lastLesson })
    if (!id) {
      set({ ...safeRead(guestKey), accountId: null, syncStatus: 'local', syncEpoch: previous.syncEpoch + 1 })
      return
    }
    const account = safeRead(accountKey(id))
    const source = previous.accountId ? empty() : { completed: previous.completed, lastLesson: previous.lastLesson }
    const next = { completed: merge(account.completed, source.completed), lastLesson: account.lastLesson || source.lastLesson }
    safeWrite(accountKey(id), next)
    set({ ...next, accountId: id, syncStatus: 'syncing', syncEpoch: previous.syncEpoch + 1 })
  },
  completeLesson: (id, score) => {
    if (!validIds.has(id) || !Number.isInteger(score) || score < 80 || score > 100) return
    const state = get()
    const prior = state.completed[id]
    const next: LessonCompletion = prior
      ? { score: Math.max(prior.score, score), completedAt: prior.completedAt }
      : { score, completedAt: new Date().toISOString() }
    const snapshot = { completed: { ...state.completed, [id]: next }, lastLesson: state.lastLesson }
    safeWrite(state.accountId ? accountKey(state.accountId) : guestKey, snapshot)
    set({ completed: snapshot.completed, syncStatus: state.accountId ? 'syncing' : 'local', syncEpoch: state.syncEpoch + 1 })
  },
  setLastLesson: id => {
    if (!validIds.has(id) || get().lastLesson === id) return
    const state = get()
    safeWrite(state.accountId ? accountKey(state.accountId) : guestKey, { completed: state.completed, lastLesson: id })
    set({ lastLesson: id })
  },
  synchronize: () => {
    const accountId = get().accountId
    if (!accountId || !useAuthStore.getState().token) return Promise.resolve()
    if (inFlight) return inFlightAccount === accountId ? inFlight : inFlight.then(() => get().synchronize())
    const epoch = get().syncEpoch
    inFlightAccount = accountId
    set({ syncStatus: 'syncing' })
    inFlight = (async () => {
      try {
        const response = await api.get<{ completed: CompletionMap }>('/education/v2/progress')
        if (get().accountId !== accountId) return
        const remote: CompletionMap = {}
        for (const [id, item] of Object.entries(response.data.completed || {})) {
          if (validIds.has(id) && Number.isInteger(item.score) && item.score >= 0 && item.score <= 100 && Number.isFinite(Date.parse(item.completedAt))) remote[id] = item
        }
        const local = get().completed
        const merged = merge(remote, local)
        for (const [id, item] of Object.entries(merged)) {
          if (get().accountId !== accountId) return
          if (!remote[id] || item.score > remote[id].score) {
            const saved = await api.put<{ completion: LessonCompletion }>(`/education/v2/progress/${id}`, { score: item.score })
            if (get().accountId !== accountId) return
            remote[id] = saved.data.completion
          }
        }
        if (get().accountId !== accountId) return
        // Include completions made while the requests were in flight. The
        // epoch change below will upload those new scores in the next pass.
        const completed = merge(merge(merged, remote), get().completed)
        const lastLesson = get().lastLesson
        safeWrite(accountKey(accountId), { completed, lastLesson })
        // Guest progress is cleared only after every completion reaches the account.
        safeRemove(guestKey)
        set({ completed, syncStatus: 'synced' })
      } catch {
        if (get().accountId === accountId) set({ syncStatus: 'offline' })
      }
    })().finally(() => {
      inFlight = null
      inFlightAccount = null
      if (get().accountId === accountId && get().syncEpoch !== epoch) void get().synchronize()
    })
    return inFlight
  },
  resetProgress: async () => {
    if (inFlight) await inFlight
    const accountId = get().accountId
    if (accountId) {
      await api.delete('/education/v2/progress')
      if (get().accountId !== accountId) return
      safeWrite(accountKey(accountId), empty())
      safeRemove(guestKey)
      set({ completed: {}, lastLesson: null, syncStatus: 'synced' })
    } else {
      safeRemove(guestKey)
      set({ completed: {}, lastLesson: null, syncStatus: 'local' })
    }
  },
}))
