import { create } from 'zustand'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { lessons } from './curriculumCatalog'

export interface LessonCompletion { score: number; completedAt: string }
export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline'
type CompletionMap = Record<string, LessonCompletion>
type ExerciseMap = Record<string, string>
type Snapshot = { completed: CompletionMap; exercises: ExerciseMap; lastLesson: string | null }
interface LearningState extends Snapshot {
  accountId: string | null
  syncStatus: SyncStatus
  syncEpoch: number
  activateAccount: (id: string | null) => void
  completeLesson: (id: string, score: number) => void
  completeExercise: (id: string) => void
  setLastLesson: (id: string) => void
  synchronize: () => Promise<void>
  resetProgress: () => Promise<void>
}
const guestKey = 'perbillion-learning-v2'
const validIds = new Set(lessons.map(lesson => lesson.id))
const accountKey = (id: string) => `perbillion-learning-account-v2-${encodeURIComponent(id)}`
const empty = (): Snapshot => ({ completed: {}, exercises: {}, lastLesson: null })
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
    const exercises: ExerciseMap = {}
    if (source.exercises && typeof source.exercises === 'object' && !Array.isArray(source.exercises)) {
      for (const id of validIds) if (typeof source.exercises[id] === 'string' && Number.isFinite(Date.parse(source.exercises[id]))) exercises[id] = source.exercises[id]
    }
    return { completed, exercises, lastLesson: validIds.has(source.lastLesson) ? source.lastLesson : null }
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
const signedInId = useAuthStore.getState().user?.id || null
const guest = safeRead(guestKey)
const first = signedInId ? safeRead(accountKey(signedInId)) : guest
const starting: Snapshot = signedInId
  ? { completed: merge(first.completed, guest.completed), exercises: { ...guest.exercises, ...first.exercises }, lastLesson: first.lastLesson || guest.lastLesson }
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
    if (previous.accountId) safeWrite(accountKey(previous.accountId), { completed: previous.completed, exercises: previous.exercises, lastLesson: previous.lastLesson })
    if (!id) {
      set({ ...safeRead(guestKey), accountId: null, syncStatus: 'local', syncEpoch: previous.syncEpoch + 1 })
      return
    }
    const account = safeRead(accountKey(id))
    const source = previous.accountId ? empty() : { completed: previous.completed, exercises: previous.exercises, lastLesson: previous.lastLesson }
    const next = { completed: merge(account.completed, source.completed), exercises: { ...source.exercises, ...account.exercises }, lastLesson: account.lastLesson || source.lastLesson }
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
    const snapshot = { completed: { ...state.completed, [id]: next }, exercises: state.exercises, lastLesson: state.lastLesson }
    safeWrite(state.accountId ? accountKey(state.accountId) : guestKey, snapshot)
    set({ completed: snapshot.completed, syncStatus: state.accountId ? 'syncing' : 'local', syncEpoch: state.syncEpoch + 1 })
  },
  completeExercise: id => {
    if (!validIds.has(id) || get().exercises[id]) return
    const state = get()
    const exercises = { ...state.exercises, [id]: new Date().toISOString() }
    safeWrite(state.accountId ? accountKey(state.accountId) : guestKey, { completed: state.completed, exercises, lastLesson: state.lastLesson })
    set({ exercises, syncStatus: state.accountId ? 'syncing' : 'local', syncEpoch: state.syncEpoch + 1 })
  },
  setLastLesson: id => {
    if (!validIds.has(id) || get().lastLesson === id) return
    const state = get()
    safeWrite(state.accountId ? accountKey(state.accountId) : guestKey, { completed: state.completed, exercises: state.exercises, lastLesson: id })
    set({ lastLesson: id })
  },
  synchronize: () => {
    const accountId = get().accountId
    if (!accountId || !useAuthStore.getState().user) return Promise.resolve()
    if (inFlight) return inFlightAccount === accountId ? inFlight : inFlight.then(() => get().synchronize())
    const epoch = get().syncEpoch
    inFlightAccount = accountId
    set({ syncStatus: 'syncing' })
    inFlight = (async () => {
      try {
        const [response, exerciseResponse] = await Promise.all([
          api.get<{ completed: CompletionMap }>('/education/v2/progress'),
          api.get<{ completed: ExerciseMap }>('/education/v2/exercises'),
        ])
        if (get().accountId !== accountId) return
        const remote: CompletionMap = {}
        for (const [id, item] of Object.entries(response.data.completed || {})) {
          if (validIds.has(id) && Number.isInteger(item.score) && item.score >= 0 && item.score <= 100 && Number.isFinite(Date.parse(item.completedAt))) remote[id] = item
        }
        const local = get().completed
        const merged = merge(remote, local)
        const remoteExercises: ExerciseMap = {}
        for (const [id, completedAt] of Object.entries(exerciseResponse.data.completed || {})) {
          if (validIds.has(id) && typeof completedAt === 'string' && Number.isFinite(Date.parse(completedAt))) remoteExercises[id] = completedAt
        }
        const exercises = { ...get().exercises, ...remoteExercises }
        for (const [id, item] of Object.entries(merged)) {
          if (get().accountId !== accountId) return
          if (!remote[id] || item.score > remote[id].score) {
            const saved = await api.put<{ completion: LessonCompletion }>(`/education/v2/progress/${id}`, { score: item.score })
            if (get().accountId !== accountId) return
            remote[id] = saved.data.completion
          }
        }
        for (const id of Object.keys(exercises)) {
          if (get().accountId !== accountId) return
          if (!remoteExercises[id]) {
            const saved = await api.put<{ completion: { completedAt: string } }>(`/education/v2/exercises/${id}`)
            remoteExercises[id] = saved.data.completion.completedAt
          }
        }
        if (get().accountId !== accountId) return
        // Include completions made while the requests were in flight. The
        // epoch change below will upload those new scores in the next pass.
        const completed = merge(merge(merged, remote), get().completed)
        const lastLesson = get().lastLesson
        const syncedExercises = { ...exercises, ...remoteExercises }
        safeWrite(accountKey(accountId), { completed, exercises: syncedExercises, lastLesson })
        // Guest progress is cleared only after every completion reaches the account.
        safeRemove(guestKey)
        set({ completed, exercises: syncedExercises, syncStatus: 'synced' })
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
      set({ completed: {}, exercises: {}, lastLesson: null, syncStatus: 'synced' })
    } else {
      safeRemove(guestKey)
      set({ completed: {}, exercises: {}, lastLesson: null, syncStatus: 'local' })
    }
  },
}))
