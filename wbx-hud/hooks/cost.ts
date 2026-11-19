import type { CostLedger, CostSession, SessionName } from '../types'

// The cost history: what each day cost, summed over every session on this machine that ran
// the mod, as Claude Code estimates it from token counts at API list prices. On a subscription
// nothing of it is billed: it is what the same work would cost on the API.

const DAY_MS = 86_400_000
// the days kept, and how long a session's last total is remembered, so a resumed one goes on
// from it rather than counting its whole total again
export const KEEP_DAYS = 60
const SESSION_KEEP_MS = 35 * DAY_MS
// the most sessions remembered, oldest dropped first
const SESSION_MAX = 500

// the local day a moment falls on: 2026-11-19
export const dayKey = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const isUsd = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0

// the stored ledger, anything malformed dropped
export const restoreLedger = (stored: unknown): CostLedger => {
  const days: CostLedger['days'] = {}
  const sessions: CostLedger['sessions'] = {}
  if (typeof stored !== 'object' || stored === null) return { days, sessions }
  const s = stored as { days?: unknown; sessions?: unknown }
  if (typeof s.days === 'object' && s.days !== null)
    for (const [k, v] of Object.entries(s.days)) if (/^\d{4}-\d\d-\d\d$/.test(k) && isUsd(v)) days[k] = v
  if (typeof s.sessions === 'object' && s.sessions !== null)
    for (const [k, v] of Object.entries(s.sessions)) {
      const e = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>
      if (!isUsd(e.usd) || typeof e.at !== 'number') continue
      const out: CostSession = { usd: e.usd, at: e.at }
      if (typeof e.startedAt === 'number') out.startedAt = e.startedAt
      if (typeof e.name === 'string') out.name = e.name
      if (typeof e.folder === 'string') out.folder = e.folder
      sessions[k] = out
    }
  return { days, sessions }
}

// what the costs tab names a session by, kept with its total
export type SessionLabel = { name?: string; folder?: string }

// whether a reading brings the ledger anything new: a total that moved, or a name or folder
export const isNews = (ledger: CostLedger, sessionId: string, usd: number, label: SessionLabel = {}) => {
  const was = ledger.sessions[sessionId]
  return (
    was?.usd !== usd ||
    (label.name !== undefined && was?.name !== label.name) ||
    (label.folder !== undefined && was?.folder !== label.folder)
  )
}

// a session's total as now read: its growth since the last reading goes to today. A total
// below the one remembered started over (a new process, a /resume swapping it): all of it is new
export const recordCost = (
  ledger: CostLedger,
  sessionId: string,
  usd: number,
  now: number,
  label: SessionLabel = {},
): CostLedger => {
  const was = ledger.sessions[sessionId]
  const before = was?.usd ?? 0
  const delta = usd >= before ? usd - before : usd
  const today = dayKey(now)
  const days = { ...ledger.days }
  if (delta > 0) days[today] = (days[today] ?? 0) + delta
  const oldest = lastDays({}, now, KEEP_DAYS)[0]?.day ?? today
  for (const k of Object.keys(days)) if (k < oldest) delete days[k]
  const sessions = Object.fromEntries(
    Object.entries({
      ...ledger.sessions,
      [sessionId]: {
        usd,
        at: now,
        startedAt: was?.startedAt ?? now,
        ...((label.name ?? was?.name) !== undefined ? { name: label.name ?? was?.name } : {}),
        ...((label.folder ?? was?.folder) !== undefined ? { folder: label.folder ?? was?.folder } : {}),
      },
    })
      .filter(([, v]) => now - v.at <= SESSION_KEEP_MS)
      .sort(([, a], [, b]) => b.at - a.at)
      .slice(0, SESSION_MAX),
  )
  return { days, sessions }
}

// the sessions last read, newest first, those that cost anything
export const latestSessions = (ledger: CostLedger, n: number) =>
  Object.entries(ledger.sessions)
    .filter(([, s]) => s.usd > 0)
    .sort(([, a], [, b]) => b.at - a.at)
    .slice(0, n)
    .map(([id, s]) => ({ id, ...s }))

// where a session's name came from: a /rename over Claude's title over the first prompt
export const NAME_RANK = { prompt: 1, title: 2, rename: 3 } as const

// a name that ranks at least as high as the one known takes its place
export const betterName = (known: SessionName | null, name: string | undefined, rank: number): SessionName | null => {
  const text = name?.replace(/\s+/g, ' ').trim()
  if (!text) return known
  return known === null || rank >= known.rank ? { name: text.slice(0, 120), rank } : known
}

// the session's names in its transcript's tail: the last /rename and the last title Claude gave
// it, both written again now and then, so a tail holds them; a line cut at the tail's start is
// skipped
export const parseTitles = (tail: string) => {
  let rename: string | undefined
  let title: string | undefined
  for (const line of tail.split('\n')) {
    if (!line.includes('-title"')) continue
    try {
      const row = JSON.parse(line) as { type?: unknown; customTitle?: unknown; aiTitle?: unknown }
      if (row.type === 'custom-title' && typeof row.customTitle === 'string') rename = row.customTitle
      if (row.type === 'ai-title' && typeof row.aiTitle === 'string') title = row.aiTitle
    } catch {}
  }
  return { rename, title }
}

// the last n days up to today, oldest first, each with its cost (0 for a day without any)
// by calendar date, not 24 hours back, so a change to or from summer time skips no day
export const lastDays = (days: Record<string, number>, now: number, n: number) => {
  const d = new Date(now)
  return Array.from({ length: n }, (_, i) => {
    const at = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (n - 1 - i), 12).getTime()
    const day = dayKey(at)
    return { day, at, usd: days[day] ?? 0 }
  })
}

export const sumDays = (days: Record<string, number>, now: number, n: number) =>
  lastDays(days, now, n).reduce((sum, d) => sum + d.usd, 0)

// a month's cost from the last 30 days: their sum, or from fewer days scaled up to 30. Counted
// from the first day with a cost, so a new install is not averaged over empty weeks; weekends
// and days off within the span stay in, as a month has them too
export const projectMonth = (days: Record<string, number>, now: number) => {
  const recent = lastDays(days, now, 30)
  const first = recent.findIndex(d => d.usd > 0)
  if (first < 0) return null
  const span = 30 - first
  const sum = recent.reduce((s, d) => s + d.usd, 0)
  return { usd: (sum / span) * 30, days: span }
}

// $0.42, $12.30, $1,234
export const fmtUsd = (usd: number) =>
  usd >= 1000 ? `$${String(Math.round(usd)).replace(/\B(?=(\d{3})+$)/g, ',')}` : `$${usd.toFixed(2)}`

// each value in eighth blocks, scaled to the largest: a blank for none, ▁ for a sliver
const LEVELS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
export const sparkline = (values: number[]) => {
  const max = Math.max(...values, 0)
  return values
    .map(v => (v <= 0 || max <= 0 ? ' ' : (LEVELS[Math.min(Math.max(Math.ceil((v / max) * 8) - 1, 0), 7)] ?? '█')))
    .join('')
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
// Th 11-19
export const fmtDay = (at: number) => `${WEEKDAYS[new Date(at).getDay()]} ${dayKey(at).slice(5)}`
