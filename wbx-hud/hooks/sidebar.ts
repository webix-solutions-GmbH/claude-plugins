import type { Diff, Hidden, Item, Place, Sample, Show } from '../types'

// what /wbx-hud show offers, each with what it draws
export const SHOWS: Record<Show, string> = {
  both: 'the bar under the prompt and the sidebar',
  bar: 'the bar under the prompt only',
  sidebar: 'the sidebar only',
}

export const isShow = (value: unknown): value is Show =>
  typeof value === 'string' && Object.hasOwn(SHOWS, value)

// the settings tab's table in its order: each item's label, the item it is a part of, and the
// places that can draw it
type ItemRow = { item: Item; label: string; parent?: Item; places: readonly Place[] }
const BOTH = ['sidebar', 'bar'] as const
const SIDEBAR = ['sidebar'] as const
export const ITEMS: readonly ItemRow[] = [
  { item: 'folder', label: 'Folder', places: BOTH },
  { item: 'git', label: 'Git branch', places: BOTH },
  { item: 'diff', label: 'diff stat', parent: 'git', places: SIDEBAR },
  { item: 'model', label: 'Model', places: BOTH },
  { item: 'effort', label: 'effort', parent: 'model', places: BOTH },
  { item: 'context', label: 'Context used', places: BOTH },
  { item: 'tokens', label: 'tokens', parent: 'context', places: BOTH },
  { item: 'categories', label: 'by category', parent: 'context', places: SIDEBAR },
  { item: 'five_hour', label: '5h limit', places: BOTH },
  { item: 'five_hour_reset', label: 'reset', parent: 'five_hour', places: BOTH },
  { item: 'five_hour_pace', label: 'pace', parent: 'five_hour', places: BOTH },
  { item: 'seven_day', label: '7d limit', places: BOTH },
  { item: 'seven_day_reset', label: 'reset', parent: 'seven_day', places: BOTH },
  { item: 'seven_day_pace', label: 'pace', parent: 'seven_day', places: BOTH },
  { item: 'agents', label: 'Agents', places: BOTH },
  { item: 'tools', label: 'Tools', places: SIDEBAR },
]

const isItem = (x: unknown): x is Item => typeof x === 'string' && ITEMS.some(r => r.item === x)

// what a fresh install hides: the pace in the bar, which the sidebar shows in full
export const DEFAULT_HIDDEN: Hidden = { sidebar: [], bar: ['five_hour_pace', 'seven_day_pace'] }

// the sidebar's sections before the table, and the items each stood for
const LEGACY: Record<string, Item[]> = {
  where: ['folder', 'git', 'model'],
  context: ['context'],
  categories: ['categories'],
  limits: ['five_hour', 'seven_day'],
  agents: ['agents'],
  tools: ['tools'],
}

// the stored hidden items, anything else dropped; the sections list of before goes to the
// sidebar, and an effort switched off beside the model to both places
export const restoreHidden = (stored: unknown, isEffortShown?: unknown): Hidden => {
  if (typeof stored === 'object' && stored !== null && !Array.isArray(stored)) {
    const s = stored as Partial<Record<Place, unknown>>
    const of = (x: unknown) => (Array.isArray(x) ? x.filter(isItem) : [])
    return { sidebar: of(s.sidebar), bar: of(s.bar) }
  }
  const sidebar = Array.isArray(stored) ? stored.flatMap(s => (typeof s === 'string' ? (LEGACY[s] ?? []) : [])) : []
  const out: Hidden = { sidebar, bar: [...DEFAULT_HIDDEN.bar] }
  if (isEffortShown === false) {
    out.sidebar.push('effort')
    out.bar.push('effort')
  }
  return out
}

const parentOf = (item: Item) => ITEMS.find(r => r.item === item)?.parent

// drawn in a place: switched on there, as is the item it is a part of
export const isOn = (hidden: Hidden, place: Place, item: Item): boolean => {
  if (hidden[place].includes(item)) return false
  const parent = parentOf(item)
  return parent === undefined || isOn(hidden, place, parent)
}

export const toggleItem = (hidden: Hidden, place: Place, item: Item): Hidden => {
  const list = hidden[place]
  return { ...hidden, [place]: list.includes(item) ? list.filter(x => x !== item) : [...list, item] }
}

// the burn rate looks back this far and needs samples spanning at least the minimum
export const BURN_WINDOW_MS = 60 * 60_000
export const BURN_MIN_SPAN_MS = 5 * 60_000

// the docked sidebar takes a quarter of the terminal, frame included, and never less than
// its rows need
const DOCK_SHARE = 0.25
const DOCK_FRAME = 2
const DOCK_MIN = 28
export const dockColumns = (terminalColumns: number) =>
  Math.max(Math.floor(terminalColumns * DOCK_SHARE) - DOCK_FRAME, DOCK_MIN)

// 8130 -> 2h15m; 190000 -> 2d04h; 45 -> 0m
export const fmtSecs = (secs: number) => {
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (d > 0) return `${d}d${String(h).padStart(2, '0')}h`
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}m`
  return `${m}m`
}

// 420 -> 0.4s; 75000 -> 1m15s
export const fmtMs = (ms: number) =>
  ms < 60_000
    ? `${(ms / 1000).toFixed(1)}s`
    : `${Math.floor(ms / 60_000)}m${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}s`

// an agent's time so far: 102 -> 1:42; 3725 -> 1:02:05
export const fmtElapsed = (secs: number) => {
  const s = Math.max(Math.floor(secs), 0)
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60))
  const ss = String(s % 60).padStart(2, '0')
  return h > 0 ? `${h}:${mm.padStart(2, '0')}:${ss}` : `${mm}:${ss}`
}

// a request's whole input side: uncached, cache-written and cache-read, as the context counts it
export const inputTokens = (u: {
  input_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}) => u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens

// the window an agent's model has: the session's when it runs on the session's model, 1M for a
// [1m] id, else the 200k most models have
export const agentWindow = (model: string | undefined, isSessionModel: boolean, sessionWindow: number | undefined) =>
  isSessionModel && sessionWindow ? sessionWindow : model && /\[1m\]/i.test(model) ? 1_000_000 : 200_000

// a reset time that moved further than this is a new limit window, not jitter in the report
const RESET_SHIFT_MS = 60_000

const isNewWindow = (last: Sample, s: Sample) => {
  if (s.percent < last.percent) return true
  const was = last.resetsAt ? Date.parse(last.resetsAt) : NaN
  const is = s.resetsAt ? Date.parse(s.resetsAt) : NaN
  return Number.isFinite(was) && Number.isFinite(is) && Math.abs(is - was) > RESET_SHIFT_MS
}

// adds a reading, drops what fell out of the window; a falling percentage or a moved reset
// time means the limit window reset, so the history starts over
export const addSample = (samples: readonly Sample[], s: Sample): Sample[] => {
  const last = samples[samples.length - 1]
  if (last && isNewWindow(last, s)) return [s]
  return [...samples, s].filter(x => s.at - x.at <= BURN_WINDOW_MS)
}

const isSample = (x: unknown): x is Sample => {
  if (typeof x !== 'object' || x === null) return false
  const s = x as Partial<Sample>
  return (
    Number.isFinite(s.at) &&
    Number.isFinite(s.percent) &&
    (s.resetsAt === undefined || typeof s.resetsAt === 'string')
  )
}

// the readings an earlier session kept in the store: the well-formed ones still in the window
export const restoreBurn = (stored: unknown, now: number): Record<string, Sample[]> => {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return {}
  const out: Record<string, Sample[]> = {}
  for (const [kind, samples] of Object.entries(stored)) {
    if (!Array.isArray(samples)) continue
    const kept = samples.filter(isSample).filter(s => s.at <= now && now - s.at <= BURN_WINDOW_MS)
    if (kept.length) out[kind] = kept
  }
  return out
}

// percent per hour across the samples, null until they span the minimum and rise
export const burnRate = (samples: readonly Sample[]): number | null => {
  const first = samples[0]
  const last = samples[samples.length - 1]
  if (!first || !last) return null
  const span = last.at - first.at
  if (span < BURN_MIN_SPAN_MS || last.percent <= first.percent) return null
  return ((last.percent - first.percent) / span) * 3_600_000
}

// the 7-day limit's window, which ends at its reset
export const WEEK_MS = 7 * 86_400_000
// a whole-window pace waits until the window has run this long, so a fresh one does not leap
const WINDOW_MIN_MS = 60 * 60_000

// percent per hour since the window began: nights and breaks count, so it forecasts over days
export const windowRate = (pct: number, resetsAt: string | undefined, windowMs: number, now: number) => {
  const reset = resetsAt ? Date.parse(resetsAt) : NaN
  if (!Number.isFinite(reset) || pct <= 0) return null
  const elapsed = now - (reset - windowMs)
  if (elapsed < WINDOW_MIN_MS || elapsed > windowMs) return null
  return (pct / elapsed) * 3_600_000
}

// "+12%/h last hour · full in 1h50m", or "resets first" when the limit resets before it would
// fill; the label names what the pace was measured over
export const forecast = (
  pct: number,
  rate: number | null,
  resetsAt: string | undefined,
  now: number,
  label = '',
) => {
  if (rate === null || pct >= 100) return ''
  const fullAt = now + ((100 - pct) / rate) * 3_600_000
  const pace = `+${fmtRate(rate)}%/h${label ? ` ${label}` : ''}`
  if (resetsFirst(pct, rate, resetsAt, now)) return `${pace} · resets first`
  return `${pace} · full in ${fmtSecs(Math.floor((fullAt - now) / 1000))}`
}

// 4.25 -> 4.3; 12.4 -> 12
export const fmtRate = (rate: number) => (rate < 10 ? rate.toFixed(1) : String(Math.round(rate)))

// whether the limit resets before the pace would fill it
export const resetsFirst = (pct: number, rate: number, resetsAt: string | undefined, now: number) => {
  const reset = resetsAt ? Date.parse(resetsAt) : NaN
  return Number.isFinite(reset) && reset <= now + ((100 - pct) / rate) * 3_600_000
}

// " 3 files changed, 84 insertions(+), 12 deletions(-)" -> { files: 3, added: 84, removed: 12 }
export const parseShortstat = (out: string): Diff | undefined => {
  const files = out.match(/(\d+) files? changed/)
  if (!files) return undefined
  return {
    files: Number(files[1]),
    added: Number(out.match(/(\d+) insertions?/)?.[1] ?? 0),
    removed: Number(out.match(/(\d+) deletions?/)?.[1] ?? 0),
  }
}

// mcp__webix-ai__list_rooms -> webix-ai:list_rooms
export const toolName = (tool: string) => {
  const m = tool.match(/^mcp__(.+?)__(.+)$/)
  return m ? `${m[1]}:${m[2]}` : tool
}

const lastPart = (path: string) => path.replace(/\\/g, '/').replace(/\/+$/, '').split('/').pop() || path

// what a call is about, from the arguments the common tools take: the first of them it has
const mainArgument = (args: Record<string, unknown>) => {
  for (const key of ['command', 'file_path', 'notebook_path', 'pattern', 'url', 'query', 'skill', 'description', 'path']) {
    const v = args[key]
    if (typeof v === 'string' && v.trim()) return { key, value: v.trim() }
  }
  return undefined
}

// the feed's row: the argument's first line, a path cut to its last part
export const subjectOf = (args: Record<string, unknown>) => {
  const arg = mainArgument(args)
  if (!arg) return ''
  const line = arg.value.split('\n')[0] ?? ''
  return arg.key.endsWith('path') ? lastPart(line) : line
}

// what a clicked row shows: the argument whole, up to a limit
export const DETAIL_MAX = 2000
export const detailOf = (args: Record<string, unknown>) => fit(mainArgument(args)?.value ?? '', DETAIL_MAX)

// cut to n cells, … marking the cut
export const fit = (text: string, n: number) => {
  const cells = [...text]
  return cells.length <= n ? text : n <= 1 ? '…' : cells.slice(0, n - 1).join('') + '…'
}

// a bar of chunks, as coralline drew them: filled, then empty
export const bar = (pct: number, width: number) => {
  const filled = Math.min(Math.max(Math.round((pct / 100) * width), 0), width)
  return ['▰'.repeat(filled), '▱'.repeat(width - filled)] as const
}

// a bar in eighths of a cell for small shares; any share above zero shows at least a sliver
const EIGHTHS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉']
export const thinBar = (share: number, width: number) => {
  const eighths = Math.round(Math.min(Math.max(share, 0), 1) * width * 8)
  const drawn = '█'.repeat(Math.floor(eighths / 8)) + (EIGHTHS[eighths % 8] ?? '')
  return drawn || (share > 0 ? '▏' : '')
}
