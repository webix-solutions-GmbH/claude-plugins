import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderElement, Timer, ToolCallInput } from 'claude-code'

import type { AgentRun, Alert, Area, Git, Item, Levels, Limit, Part, Place, Sample, Show, Snapshot, ToolRun } from '../types'
import { AREAS, DEFAULT_LEVELS, fmtLevels, levelColor, levelOf, parseLevels, readLevels, restoreLevels } from './levels'
import {
  addSample,
  agentWindow,
  bar,
  burnRate,
  DEFAULT_HIDDEN,
  detailOf,
  dockColumns,
  fit,
  fmtElapsed,
  fmtMs,
  fmtRate,
  fmtSecs,
  forecast,
  inputTokens,
  isOn,
  isShow,
  ITEMS,
  parseShortstat,
  resetsFirst,
  restoreBurn,
  restoreHidden,
  SHOWS,
  subjectOf,
  thinBar,
  toggleItem,
  toolName,
  WEEK_MS,
  windowRate,
} from './sidebar'
import { isThemeName, THEMES, themeOf } from './themes'
import type { ThemeName } from './themes'

// Nerd Font powerline glyphs, drawn by the terminal itself: each theme's edges (left cap,
// right cap, fill edge between segments) and the thin / between usage segments
const EDGES = {
  round: [String.fromCodePoint(0xe0b6), String.fromCodePoint(0xe0b4), String.fromCodePoint(0xe0b0)],
  slant: [String.fromCodePoint(0xe0ba), String.fromCodePoint(0xe0bc), String.fromCodePoint(0xe0bc)],
} as const
const SLASH = String.fromCodePoint(0xe0bb)

const snap = atom({ plugin: 'wbx-hud', key: 'snap' } as const, null)
const demo = atom({ plugin: 'wbx-hud', key: 'demo' } as const, null)
// the session's theme, drawn from at once; persisted under the store's "theme"
const theme = atom({ plugin: 'wbx-hud', key: 'theme' } as const, 'webix')
// persisted under the store's "burn", so a new session goes on with the last hour's readings
const burn = atom({ plugin: 'wbx-hud', key: 'burn' } as const, {})
const tools = atom({ plugin: 'wbx-hud', key: 'tools' } as const, [])
const expanded = atom({ plugin: 'wbx-hud', key: 'expanded' } as const, null)
const allTools = atom({ plugin: 'wbx-hud', key: 'allTools' } as const, false)
// what is drawn, persisted under the store's "show" as the theme is
const show = atom({ plugin: 'wbx-hud', key: 'show' } as const, 'both')
// the main loop's effort, and the items switched off in the sidebar and the bar (persisted)
const effort = atom({ plugin: 'wbx-hud', key: 'effort' } as const, null)
const hidden = atom({ plugin: 'wbx-hud', key: 'hidden' } as const, DEFAULT_HIDDEN)
// each area's thresholds and the alerts switched off, both set in the settings tab (persisted)
const thresholds = atom({ plugin: 'wbx-hud', key: 'thresholds' } as const, DEFAULT_LEVELS)
const alertsOff = atom({ plugin: 'wbx-hud', key: 'alertsOff' } as const, [])
// the agents whose turn runs, and the clock their elapsed time is drawn from
const agents = atom({ plugin: 'wbx-hud', key: 'agents' } as const, [])
const tick = atom({ plugin: 'wbx-hud', key: 'tick' } as const, 0)
// ticks each second while agents run
let ticker: Timer | undefined
// agents whose turn ended, so a late spawn answer does not bring one back; a new turn does
const ended = new Set<string>()

// the sidebar's pane id and its settings tab's, how many tool calls its feed shows and the
// session keeps, and its padding left and right
const PANE = 'wbx-hud'
const SETTINGS = 'wbx-hud-settings'
const FEED = 10
const HISTORY = 200
const PAD = 1
// the settings table's item column, up to the sidebar column's heading: the table is 26 cells,
// as narrow as the docked sidebar gets
const NAME_W = 14
// the sidebar opens with it
const TITLE = 'webix HUD'

// plain Unicode circles, so no Nerd Font is needed: fills in quarters
const RINGS = ['○', '◔', '◑', '◕', '●']
export const ring = (pct: number) => RINGS[Math.min(Math.max(Math.round(pct / 25), 0), 4)] ?? RINGS[0]

// cells a pill takes: its texts, the two caps and a separator between segments
export const pillWidth = (texts: string[]) =>
  texts.reduce((n, t) => n + [...t].length, 0) + 2 + Math.max(texts.length - 1, 0)


const fmtTok = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n)

const fmtCountdown = (resetsAt: string | undefined, now: number) => {
  if (!resetsAt) return ''
  const diff = Math.floor((Date.parse(resetsAt) - now) / 1000)
  return diff <= 0 ? 'now' : fmtSecs(diff)
}

const shortenPath = (cwd: string) => {
  const s = cwd.replace(/\\/g, '/')
  const parts = s.split('/').filter(Boolean)
  return parts.length > 4 ? `${parts[0]}/${parts[1]}/…/${parts[parts.length - 1]}` : s
}

// claude-opus-5-5[1m] -> Opus 5.5 (1M); claude-sonnet-4-5-20250929 -> Sonnet 4.5
export const modelName = (id: string) => {
  const m = id.trim().match(/^(?:claude-)?([a-z]+)((?:-\d{1,2})+)(?:-\d{8})?(?:\[(\w+)\])?$/i)
  if (!m || !m[1] || !m[2]) return id.replace(/^Claude /, '')
  const family = m[1].charAt(0).toUpperCase() + m[1].slice(1)
  const version = m[2].slice(1).replace(/-/g, '.')
  return `${family} ${version}${m[3] ? ` (${m[3].toUpperCase()})` : ''}`
}

export const parseGit = (out: string): Git | null => {
  let branch = ''
  let staged = false
  let unstaged = false
  let untracked = false
  let oid = ''
  let ahead = 0
  let behind = 0
  for (const line of out.split('\n')) {
    if (line.startsWith('# branch.head ')) branch = line.slice(14).trim()
    else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+) -(\d+)/)
      ahead = Number(m?.[1] ?? 0)
      behind = Number(m?.[2] ?? 0)
    } else if (/^[12] /.test(line)) {
      if (line[2] !== '.') staged = true
      if (line[3] !== '.') unstaged = true
    } else if (line.startsWith('? ')) untracked = true
    else if (line.startsWith('# branch.oid ')) oid = line.slice(13, 20)
  }
  if (branch === '(detached)') branch = oid
  if (!branch) return null
  return {
    branch,
    marks: (staged ? '+' : '') + (unstaged ? '!' : '') + (untracked ? '?' : ''),
    ab: (ahead ? `⇡${ahead}` : '') + (behind ? `⇣${behind}` : ''),
    isDirty: staged || unstaged || untracked,
  }
}

// one reading at a time: a call while one runs shares it, as a main turn's end raises both
// session.measure and turn.complete
let reading: Promise<void> | undefined
function refresh($: EngineInterface) {
  reading ??= readAll($).finally(() => {
    reading = undefined
  })
  return reading
}

async function readAll($: EngineInterface) {
  const [cwd, model, usage, now] = await Promise.all([
    $.session.cwd(),
    $.session.model(),
    // the sidebar's breakdown; summary is estimated locally and sends no request
    $.session.usage({ breakdown: 'summary' }),
    $.clock.now(),
  ])
  let git: Git | null = null
  try {
    const r = await $.process.run(['git', '-C', cwd, 'status', '--porcelain=v2', '--branch'], {
      timeoutMs: 2000,
    })
    if (r.exitCode === 0) git = parseGit(r.stdout)
    if (git?.isDirty) {
      const d = await $.process.run(['git', '-C', cwd, 'diff', '--shortstat', 'HEAD'], { timeoutMs: 2000 })
      if (d.exitCode === 0) git = { ...git, diff: parseShortstat(d.stdout) }
    }
  } catch {}
  const limits: Limit[] = usage.rateLimits.map(l => ({
    kind: l.kind,
    percent: l.percentUsed,
    resetsAt: l.resetsAt,
  }))
  const parts: Part[] | undefined = usage.context.breakdown?.categories
    .filter(c => c.kind === 'used' && c.tokens > 0)
    .map(c => ({ name: c.name, tokens: c.tokens }))
    .sort((a, b) => b.tokens - a.tokens)
  const next: Snapshot = {
    cwd,
    model: modelName(model),
    git,
    contextPercent: usage.context.percent,
    contextTokens: usage.context.tokens,
    contextWindow: usage.context.window,
    parts,
    limits,
    costUsd: usage.cost?.usd,
    now,
  }
  await update($, snap, () => next)
  // empty after a /clear, which starts the session's values over: go on from the stored ones
  // rather than overwrite them
  const kept = restoreBurn(await $.store.get('burn'), now)
  await update($, burn, history => {
    const out = Object.keys(history).length ? { ...history } : kept
    // only the 5h pace reads them; the 7d pace is figured from its window alone
    for (const l of limits.filter(x => x.kind === 'five_hour'))
      out[l.kind] = addSample(out[l.kind] ?? [],{ at: now, percent: l.percent, resetsAt: l.resetsAt })
    return out
  })
  await $.store.set('burn', await read($, burn))
  await toastLevels($, next).catch(() => {})
}

async function startRun($: EngineInterface, e: ToolCallInput) {
  const run: ToolRun = {
    id: e.tool_use_id,
    tool: toolName(e.tool),
    subject: subjectOf(e as unknown as Record<string, unknown>),
    detail: detailOf(e as unknown as Record<string, unknown>),
    isAgent: e.agentId !== undefined,
    startedAt: await $.clock.now(),
    status: 'run',
  }
  await update($, tools, list => [...list, run].slice(-HISTORY))
  return run
}

async function endRun($: EngineInterface, run: ToolRun, status: ToolRun['status']) {
  const ms = (await $.clock.now()) - run.startedAt
  await update($, tools, list => list.map(t => (t.id === run.id ? { ...t, status, ms } : t)))
}

// adds an agent, or fills in what is known of one already there; the first agent starts the
// second ticks for the elapsed times
async function upsertAgent($: EngineInterface, id: string, fill: Partial<AgentRun>) {
  if (ended.has(id)) return
  const now = await $.clock.now()
  await update($, agents, list =>
    list.some(a => a.id === id)
      ? list.map(a => (a.id === id ? { ...a, ...fill } : a))
      : [...list, { id, type: 'agent', description: '', startedAt: now, ...fill }],
  )
  const last = await read($, tick)
  await update($, tick, () => now)
  // no tick for seconds while the ticker is held: a refused period ended it, so start anew
  if (ticker && now - last > 5_000) {
    ticker.cancel()
    ticker = undefined
  }
  ticker ??=$.clock.every(1000, () => void $.clock.now().then(t => update($, tick, () => t)).catch(() => {}))
}

// an agent whose turn started before any spawn named it: its type and task from the list
async function startAgent($: EngineInterface, id: string) {
  ended.delete(id)
  const info = (await $.agent.list().catch(() => [])).find(a => a.id === id)
  await upsertAgent($, id, info ? { type: info.type, description: info.description } : {})
}

// an agent's turn ended: it leaves at once; the last one stops the ticks
async function endAgent($: EngineInterface, id: string) {
  ended.add(id)
  await update($, agents, list => list.filter(a => a.id !== id))
  if ((await read($, agents)).length === 0) {
    ticker?.cancel()
    ticker = undefined
  }
}

// shows an agent's transcript, or the main one without an id; a refusal says why in a toast
async function viewAgent($: EngineInterface, agentId?: string) {
  const r = await $.ui.view(agentId === undefined ? {} : { agentId })
  if (r.deny !== undefined) await $.ui.toast(`wbx-hud: ${r.deny}`)
}

// drops agents the engine lists as ended or does not list, should their end have gone unheard;
// one younger than a minute stays, as the list may name a new agent only seconds after it started
async function pruneAgents($: EngineInterface) {
  if ((await read($, agents)).length === 0) return
  const now = await $.clock.now()
  const listed = await $.agent.list()
  const live = new Set(listed.filter(a => !['completed', 'failed', 'killed'].includes(a.status)).map(a => a.id))
  for (const a of await read($, agents)) if (!live.has(a.id) && now - a.startedAt > 60_000) await endAgent($, a.id)
}

// opens the sidebar at a quarter of the terminal, or sets that width anew on an open one
const openPane = ($: EngineInterface, terminalColumns: number | undefined) =>
  $.ui.open({ id: PANE, title: 'HUD', ...(terminalColumns ? { columns: dockColumns(terminalColumns) } : {}) })

// the settings tab, beside the sidebar at its width; Escape closes it
const openSettings = ($: EngineInterface, terminalColumns: number | undefined) =>
  $.ui.open({
    id: SETTINGS,
    title: 'Settings',
    closeOnEscape: true,
    ...(terminalColumns ? { columns: dockColumns(terminalColumns) } : {}),
  })

async function setTheme($: EngineInterface, name: ThemeName) {
  await update($, theme, () => name)
  await $.store.set('theme', name)
}

// switches what is drawn, opening or closing the sidebar to match
async function setShow($: EngineInterface, what: Show, terminalColumns: number | undefined) {
  await update($, show, () => what)
  await $.store.set('show', what)
  const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
  if (what === 'bar' && isOpen) await $.ui.close({ id: PANE })
  if (what !== 'bar' && !isOpen) await openPane($, terminalColumns)
}

async function toggle($: EngineInterface, place: Place, item: Item) {
  await update($, hidden, h => toggleItem(restoreHidden(h), place, item))
  await $.store.set('hidden', await read($, hidden))
}

// the hidden items as drawn: a reload keeps the session's value, which may still be the
// sections list of before until session.start has read the store anew
const readHidden = async ($: EngineInterface) => restoreHidden(await read($, hidden))

// the effort as configured, until a turn names the one in use: the environment's override,
// else the merged settings' effortLevel, else a /config row that names an effort
async function readEffort($: EngineInterface) {
  const fromEnv = await $.env.get('CLAUDE_CODE_EFFORT_LEVEL').catch(() => undefined)
  const fromSettings = await $.settings.read({ key: 'effortLevel' }).catch(() => undefined)
  const fromConfig = (await $.config.list().catch(() => [])).find(row => /effort/i.test(row.key))?.value
  const value = [fromEnv, fromSettings, fromConfig].find(v => (typeof v === 'string' && v) || typeof v === 'number')
  if (typeof value === 'string' || typeof value === 'number') await update($, effort, () => String(value))
}

// kept in the store as well, so a new session or a /clear starts from the last one in use
async function setEffort($: EngineInterface, value: string | number) {
  await update($, effort, () => String(value))
  await $.store.set('effort', String(value))
}

// the thresholds set in the settings tab, by area, over the /config options
const readStoredLevels = async ($: EngineInterface) => restoreLevels(await $.store.get('levels'))

// sets an area's thresholds, or with none goes back to the /config option's
async function setLevels($: EngineInterface, area: Area, levels: Levels | undefined, base: Record<Area, Levels>) {
  const stored = await readStoredLevels($)
  if (levels) stored[area] = levels
  else delete stored[area]
  await $.store.set('levels', stored)
  await update($, thresholds, () => ({ ...base, ...stored }))
}

async function toggleAlert($: EngineInterface, alert: Alert) {
  await update($, alertsOff, list => (list.includes(alert) ? list.filter(a => a !== alert) : [...list, alert]))
  await $.store.set('alertsOff', await read($, alertsOff))
}

const ALERTS: Record<Alert, string> = {
  fill: 'fill context from yellow, limits from orange',
  hint: 'suggest /clear from orange',
  toast: 'toast at orange and red',
  band: 'band above the prompt at red',
}

const restoreAlertsOff = (stored: unknown): Alert[] =>
  Array.isArray(stored) ? stored.filter((a): a is Alert => typeof a === 'string' && Object.hasOwn(ALERTS, a)) : []

// the level from which an area's segment and heading are filled: the context at yellow
// already, as it is best cleared early; the limits at orange
const FILL_FROM: Record<Area, number> = { context: 1, five_hour: 2, seven_day: 2 }

const AREA_NAMES: Record<Area, string> = { context: 'context', five_hour: '5h limit', seven_day: '7d limit' }

// an area's percentage in a snapshot, undefined without a reading
const percentOf = (s: Snapshot, area: Area) =>
  area === 'context' ? s.contextPercent : s.limits.find(l => l.kind === area)?.percent

// what an area at orange or red says, in a toast and in the band
const alertText = (s: Snapshot, area: Area, level: number) => {
  const pct = Math.round(percentOf(s, area) ?? 0)
  if (area === 'context') return `context at ${pct}%: ${level >= 3 ? '/clear or /compact' : 'a good point to /clear'}`
  const cd = fmtCountdown(s.limits.find(l => l.kind === area)?.resetsAt, s.now)
  return `${AREA_NAMES[area]} at ${pct}%${cd ? `, resets in ${cd}` : ''}`
}

// a toast when an area reaches orange or red, once per level: one that falls below a level
// toasts again on its return. The levels reached are kept in the store, so a new session or a
// /clear does not repeat a limit's toast
async function toastLevels($: EngineInterface, s: Snapshot) {
  const levels = await read($, thresholds)
  const isOn = !(await read($, alertsOff)).includes('toast')
  const stored = await $.store.get('alerted')
  const was = (typeof stored === 'object' && stored !== null ? stored : {}) as Record<string, unknown>
  const reached: Record<string, number> = {}
  for (const area of AREAS) {
    const before = typeof was[area] === 'number' ? was[area] : 0
    const pct = percentOf(s, area)
    if (pct === undefined) {
      reached[area] = before
      continue
    }
    const level = levelOf(levels[area], pct)
    if (isOn && level >= 2 && level > before) await $.ui.toast(`wbx-hud: ${alertText(s, area, level)}`)
    reached[area] = level
  }
  await $.store.set('alerted', reached)
}

// the levels a demo has toasted, by area: apart from the real ones in the store, so a demo
// neither repeats nor holds back a real toast
const demoReached = new Map<Area, number>()

// as toastLevels for the simulated percentage, each toast marked as the demo's
async function toastDemo($: EngineInterface, pct: number) {
  const live = await read($, snap)
  if (live === null || (await read($, alertsOff)).includes('toast')) return
  const s = withDemo(live, pct)
  const levels = await read($, thresholds)
  for (const area of AREAS) {
    const level = levelOf(levels[area], pct)
    if (level >= 2 && level > (demoReached.get(area) ?? 0)) await $.ui.toast(`wbx-hud demo: ${alertText(s, area, level)}`)
    demoReached.set(area, level)
  }
}

// how often the watch after a /clear looks for the new session id, 100 ms apart
const CLEAR_TRIES = 50

// after a /clear: once the session id is no longer the ended one, the stored settings and a
// reading; says whether it got that far
async function afterClear($: EngineInterface, ended: string, base: Record<Area, Levels>) {
  if ((await $.session.id()) === ended) return false
  await restore($, base).catch(() => {})
  await refresh($).catch(() => {})
  return true
}

// the stored settings and the effort, at session start and again after a /clear; base is
// the thresholds the /config options give
async function restore($: EngineInterface, base: Record<Area, Levels>) {
  const stored = await readStoredLevels($)
  await update($, thresholds, () => ({ ...base, ...stored }))
  const off = restoreAlertsOff(await $.store.get('alertsOff'))
  await update($, alertsOff, () => off)
  const saved = await $.store.get('theme')
  if (isThemeName(saved)) await update($, theme, () => saved)
  const shown = await $.store.get('show')
  if (isShow(shown)) await update($, show, () => shown)
  // the sections list and the effort switch of before 0.8 are read into the table's items
  const items = restoreHidden(await $.store.get('hidden'), await $.store.get('isEffortShown'))
  await update($, hidden, () => items)
  // the last effort in use until the configured one is read, or a turn names it
  const last = await $.store.get('effort')
  if (typeof last === 'string' && last) await update($, effort, () => last)
  await readEffort($).catch(() => {})
}

// the model's name with the effort beside it, when there is one and it is wanted
const modelLabel = (model: string, eff: string | null, isShown: boolean) =>
  eff !== null && isShown ? `${model} · ${eff}` : model

// a limit's pace: 5h over the last hour's readings, 7d over the week so far, as hours of work
// do not run all week
const paceRate = (kind: 'five_hour' | 'seven_day', l: Limit, history: Record<string, Sample[]>, now: number) =>
  kind === 'five_hour' ? burnRate(history[kind] ?? []) : windowRate(l.percent, l.resetsAt, WEEK_MS, now)

// the snapshot with the context and both limits at the simulated percentage
export const withDemo = (s: Snapshot, pct: number): Snapshot => ({
  ...s,
  contextPercent: pct,
  limits: ['five_hour', 'seven_day'].map(kind => ({
    kind,
    percent: pct,
    resetsAt: s.limits.find(l => l.kind === kind)?.resetsAt,
  })),
})

const USAGE = [
  'Usage:',
  '  /wbx-hud theme            list the themes',
  '  /wbx-hud theme <name>     switch theme (kept across sessions)',
  '  /wbx-hud demo             sweep the rings from 0 to 100%',
  '  /wbx-hud demo <percent>   pin the rings at a percentage',
  '  /wbx-hud demo off         end the demo',
  '  /wbx-hud pane             open or close the sidebar',
  '  /wbx-hud show             list what can be shown',
  '  /wbx-hud show <what>      both, bar or sidebar (kept across sessions)',
  '  /wbx-hud settings         open the settings tab beside the sidebar',
].join('\n')

export const register: Register = (on, options) => {
  // the /config options' thresholds; the settings tab's, kept in the store, go over them
  const base = {
    context: parseLevels(options.contextLevels, 'context'),
    five_hour: parseLevels(options.fiveHourLevels, 'five_hour'),
    seven_day: parseLevels(options.sevenDayLevels, 'seven_day'),
  }
  let sweep: Timer | undefined
  // the 30 s reading, one however often the session starts
  let poll: Timer | undefined
  // waits after a /clear for the new session id
  let clearWatch: Timer | undefined
  // the terminal's width as the bar last read it: the sidebar's width follows it
  let terminalColumns: number | undefined
  // whether the sidebar waits to open at session start, until the bar has read the width
  let isPaneDue = false

  on('session.start', async ($, e, next) => {
    const r = await next(e)
    await $.command.register({
      name: 'wbx-hud',
      description: 'Switch the theme, choose bar, sidebar or both, open the settings, toggle the sidebar, or preview with demo',
      argumentHint: 'theme [name] | show [both|bar|sidebar] | settings | pane | demo [percent|off]',
    })
    await restore($, base)
    // a failed first reading leaves it to the timer below, not the session without one
    await refresh($).catch(() => {})
    // keeps the reset countdowns and git state current between turns, and the agents honest
    poll?.cancel()
    poll = $.clock.every(30_000, () => {
      void refresh($).catch(() => {})
      void pruneAgents($).catch(() => {})
    })
    // opened by the bar once it knows the width; unasked, the surface docks it only on a wide
    // terminal and holds it back otherwise. The bar may have drawn already while the awaits
    // above ran: then the width is known and it opens here.
    const isDue = options.sidebar !== 'manual' && (await read($, show)) !== 'bar'
    if (isDue && terminalColumns !== undefined) await openPane($, terminalColumns).catch(() => {})
    else isPaneDue = isDue
    return r
  })

  // the feed: each call shows while it runs, then with its outcome and duration; the feed's
  // own failures never reach the call
  on('tool.call', async ($, e, next) => {
    const run = await startRun($, e).catch(() => undefined)
    let status: ToolRun['status'] = 'error'
    try {
      const r = await next(e)
      status = r.deny !== undefined ? 'denied' : r.isError ? 'error' : 'ok'
      return r
    } finally {
      if (run) await endRun($, run, status).catch(() => {})
    }
  }).catch(($, e, next) => next(e)) // a failed or slow feed passes the call on, its result replayed

  // the effort in use: each request of the main loop names it, after any downgrade; an agent's
  // request tells its context once answered (a streaming event: the hook forwards the request's
  // chunks untouched)
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined && e.effort !== undefined) await setEffort($, e.effort).catch(() => {})
    const r = yield* next(e)
    const id = e.agentId
    if (id !== undefined && r.usage) {
      const u = r.usage
      await upsertAgent($, id, { contextTokens: inputTokens(u) }).catch(() => {})
    }
    return r
  })

  // the agents: one shows from its spawn or its turn's start until its turn ends
  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    const id = r.agentId
    if (id !== undefined) await upsertAgent($, id, { type: e.subagentType, description: e.description, model: r.model }).catch(() => {})
    return r
  }).catch(($, e, next) => next(e)) // a failed row passes the spawn on, its result replayed

  on('turn.start', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined) await startAgent($, e.agentId).catch(() => {})
    return r
  })

  // /effort or the /config menu changed it: read it at once, not at the next request
  on('command.run', { command: 'effort' }, async ($, e, next) => {
    const r = await next(e)
    await readEffort($).catch(() => {})
    return r
  })

  on('config.set', async ($, e, next) => {
    const r = await next(e)
    if (/effort/i.test(e.key)) await readEffort($).catch(() => {})
    if (/model/i.test(e.key)) await refresh($).catch(() => {})
    return r
  })

  // a reading that fails waits for the next: the 30 s timer, a turn's end
  on('session.measure', async ($, e, next) => {
    const r = await next(e)
    await refresh($).catch(() => {})
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    if (e.agentId !== undefined) await endAgent($, e.agentId).catch(() => {})
    await refresh($).catch(() => {})
    return r
  })

  // a /clear goes on under a new session id with the session's values started over and no
  // session.start: once the id has moved on, restore them and read anew, as the start does.
  // Not on classic.SessionStart: the built-in guard sends every classic.* event past user mods.
  on('session.end', async ($, e, next) => {
    const r = await next(e)
    if (e.reason === 'clear') {
      clearWatch?.cancel()
      const ended = e.sessionId
      let tries = 0
      let isBusy = false
      clearWatch = $.clock.every(100, () => {
        if (isBusy) return
        isBusy = true
        void afterClear($, ended, base)
          .then(isDone => {
            if (isDone || ++tries >= CLEAR_TRIES) clearWatch?.cancel()
          })
          .catch(() => {})
          .finally(() => (isBusy = false))
      })
    }
    return r
  })

  // redraw at once on a directory or model switch, not at the next tick; by the commands, as
  // the built-in guard sends classic.CwdChanged and classic.PostModelSwitch past user mods
  on('command.run', { command: 'cd' }, async ($, e, next) => {
    const r = await next(e)
    await refresh($).catch(() => {})
    return r
  })

  on('command.run', { command: 'model' }, async ($, e, next) => {
    const r = await next(e)
    await refresh($).catch(() => {})
    return r
  })

  on('command.run', { command: 'wbx-hud' }, async ($, e) => {
    const [sub, arg] = e.args.trim().split(/\s+/)
    if (sub === 'show') {
      const current = await read($, show)
      if (arg === undefined) {
        const list = Object.entries(SHOWS).map(([name, what]) => `${name === current ? '*' : ' '} ${name.padEnd(8)}${what}`)
        return { text: ['Shown (* is in use):', ...list, 'Switch with /wbx-hud show <name>.'].join('\n') }
      }
      if (!isShow(arg)) return { text: `No "${arg}". Choose ${Object.keys(SHOWS).join(', ')}.` }
      await setShow($, arg, terminalColumns)
      return { text: `Showing ${SHOWS[arg]}.` }
    }
    if (sub === 'settings') {
      const opened = await openSettings($, terminalColumns)
      return { text: opened.isPlaced ? 'Settings opened.' : `Settings not shown: ${opened.reason}` }
    }
    if (sub === 'pane') {
      if ((await read($, show)) === 'bar')
        return { text: 'The sidebar is off: /wbx-hud show both or /wbx-hud show sidebar turns it on.' }
      const isOpen = (await $.ui.panes()).some(p => p.id === PANE)
      if (isOpen) {
        await $.ui.close({ id: PANE })
        return { text: 'Sidebar closed.' }
      }
      const opened = await openPane($, terminalColumns)
      return { text: opened.isPlaced ? 'Sidebar opened.' : `Sidebar not shown: ${opened.reason}` }
    }
    if (sub === 'theme') {
      const current = await read($, theme)
      if (arg === undefined) {
        const list = Object.keys(THEMES).map(name => `${name === current ? '*' : ' '} ${name}`)
        return { text: ['Themes (* is in use):', ...list, 'Switch with /wbx-hud theme <name>.'].join('\n') }
      }
      if (!isThemeName(arg)) return { text: `No theme "${arg}". Themes: ${Object.keys(THEMES).join(', ')}.` }
      await setTheme($, arg)
      return { text: `Theme set to ${arg}.` }
    }
    if (sub !== 'demo') return { text: USAGE }
    sweep?.cancel()
    sweep = undefined
    // each demo toasts its own crossings afresh
    demoReached.clear()
    if (arg === 'off') {
      await update($, demo, () => null)
      return { text: 'Demo off.' }
    }
    if (arg !== undefined) {
      const pct = Number(arg)
      if (!Number.isFinite(pct) || pct < 0) return { text: USAGE }
      await update($, demo, () => pct)
      await toastDemo($, pct).catch(() => {})
      return { text: `Demo pinned at ${pct}%. /wbx-hud demo off ends it.` }
    }
    let pct = 0
    await update($, demo, () => pct)
    sweep = $.clock.every(100, () => {
      pct += 1
      if (pct > 100) {
        sweep?.cancel()
        sweep = undefined
        void update($, demo, () => null)
      } else {
        const at = pct
        void update($, demo, () => at).then(() => toastDemo($, at)).catch(() => {})
      }
    })
    return { text: 'Sweeping the rings from 0 to 100% over 10 seconds.' }
  })

  // the bar sits under the prompt, above the engine's own hint line, which it keeps
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const live = await read($, snap)
    const sim = await read($, demo)
    const T = themeOf(await read($, theme))
    const running = (await read($, agents)).length
    const off = await readHidden($)
    const history = await read($, burn)
    const shows = (item: Item) => isOn(off, 'bar', item)
    const levels = await read($, thresholds)
    const alertOff = await read($, alertsOff)
    const hint = await next(e)
    const columns = e.viewport?.columns
    if (columns && columns !== terminalColumns) {
      const wasKnown = terminalColumns !== undefined
      terminalColumns = columns
      if (isPaneDue) {
        isPaneDue = false
        void openPane($, columns).catch(() => {})
      } else if (wasKnown) {
        // a resize: an open sidebar keeps its quarter; a closed one stays closed
        void $.ui
          .panes()
          .then(panes => (panes.some(p => p.id === PANE) ? openPane($, columns) : undefined))
          .catch(() => {})
      }
    }
    // sidebar only: the bar still reads the width above, but draws nothing over the hint
    if (live === null || (await read($, show)) === 'sidebar') return hint
    const s = sim === null ? live : withDemo(live, sim)

    const { Box, Text } = $.ui.resolve(e)

    // a segment is runs of plain text, so its width can be measured before drawing
    type Run = { text: string; color: string; bold?: boolean }
    // usage segments are the context and limit ones; on one background the theme's slash parts them
    type Seg = { key: string; bg: string; runs: Run[]; isUsage?: boolean }
    const [CAP_L, CAP_R, SEP] = EDGES[T.edges]
    const edge = (seg: Seg, after: Seg) =>
      T.edges === 'slant' && T.slash && seg.isUsage && after.isUsage && seg.bg === after.bg ? (
        <Text color={T.slash} backgroundColor={seg.bg}>
          {SLASH}
        </Text>
      ) : (
        <Text color={seg.bg} backgroundColor={after.bg}>
          {SEP}
        </Text>
      )
    const pill = (segs: Seg[]) => (
      <Box flexDirection="row">
        <Text color={segs[0]?.bg}>{CAP_L}</Text>
        {segs.map((seg, i) => {
          const after = segs[i + 1]
          return (
            <Box key={seg.key} flexDirection="row">
              <Text backgroundColor={seg.bg}>
                {seg.runs.map((r, j) => (
                  <Text key={String(j)} color={r.color} bold={r.bold}>
                    {r.text}
                  </Text>
                ))}
              </Text>
              {after ? edge(seg, after) : <Text color={seg.bg}>{CAP_R}</Text>}
            </Box>
          )
        })}
      </Box>
    )

    const plain = (key: string, fill: { bg: string; fg: string }, text: string): Seg => ({
      key,
      bg: fill.bg,
      runs: [{ text, color: fill.fg, bold: T.bold }],
    })
    const where: Seg[] = []
    if (shows('folder')) where.push(plain('dir', T.dir, ` ${shortenPath(s.cwd)} `))
    if (s.git && shows('git')) {
      const text = ` ⎇ ${s.git.branch}${s.git.marks}${s.git.ab} `
      where.push(plain('git', s.git.isDirty ? T.gitDirty : T.gitOk, text))
    }
    if (shows('model'))
      where.push(plain('model', T.model, ` ◆ ${modelLabel(s.model, await read($, effort), shows('effort'))} `))

    // from orange a segment takes its level's color as background, its texts the theme's ink
    const filled = (seg: Seg, area: Area, pct: number): Seg =>
      !alertOff.includes('fill') && levelOf(levels[area], pct) >= FILL_FROM[area]
        ? { ...seg, bg: levelColor(T, levels[area], pct), runs: seg.runs.map(r => ({ ...r, color: T.ink })) }
        : seg

    const usage: Seg[] = []
    if (s.contextPercent !== undefined && shows('context')) {
      const pct = Math.round(s.contextPercent)
      const color = levelColor(T, levels.context, pct)
      const runs: Run[] = [{ text: ` ${ring(pct)} ${pct}% `, color }]
      if (shows('tokens')) runs.push({ text: `${fmtTok(s.contextTokens ?? 0)} `, color: T.tokens })
      // from orange, what to do about it
      if (!alertOff.includes('hint') && levelOf(levels.context, pct) >= 2) runs.push({ text: '→ /clear ', color })
      usage.push(filled({ key: 'ctx', bg: T.ctx, isUsage: true, runs }, 'context', pct))
    }
    for (const [kind, label, bg] of [
      ['five_hour', '5h', T.l5h],
      ['seven_day', '7d', T.l7d],
    ] as const) {
      const l = s.limits.find(x => x.kind === kind)
      if (!l || !shows(kind)) continue
      const pct = Math.round(l.percent)
      const cd = fmtCountdown(l.resetsAt, s.now)
      const level = levelColor(T, levels[kind], pct)
      const runs: Run[] = [
        { text: ` ${label} `, color: T.label ?? level },
        { text: `${ring(pct)} ${pct}% `, color: level },
      ]
      // the pace, green while the limit resets before it would fill; none in a demo
      const rate = sim === null && shows(`${kind}_pace`) && pct < 100 ? paceRate(kind, l, history, s.now) : null
      if (rate !== null)
        runs.push({ text: `↗${fmtRate(rate)}%/h `, color: resetsFirst(l.percent, rate, l.resetsAt, s.now) ? T.ok : T.hot })
      if (cd && shows(`${kind}_reset`)) runs.push({ text: `↺${cd} `, color: T.dim })
      usage.push(filled({ key: kind, bg, runs, isUsage: true }, kind, pct))
    }
    if (s.costUsd !== undefined && s.limits.length === 0) {
      usage.push({ key: 'cost', bg: T.l7d, isUsage: true, runs: [{ text: ` $${s.costUsd.toFixed(2)} `, color: T.dim }] })
    }
    // the agents running, while any are
    if (running && shows('agents')) {
      const text = ` ↳ ${running} agent${running === 1 ? '' : 's'} `
      usage.push({ key: 'agents', bg: T.l7d, isUsage: true, runs: [{ text, color: T.warn }] })
    }
    // marks simulated figures so they are never taken for real ones
    if (sim !== null) usage.push({ key: 'demo', bg: T.l7d, isUsage: true, runs: [{ text: ' demo ', color: T.dim }] })

    const all = [...where, ...usage]
    // everything switched off: the hint alone
    if (!all.length) return hint
    const fits = pillWidth(all.map(seg => seg.runs.map(r => r.text).join(''))) <= (e.viewport?.columns ?? Infinity)
    return (
      <Box flexDirection="column">
        {!usage.length || !where.length || fits ? pill(all) : [pill(where), pill(usage)]}
        {hint}
      </Box>
    )
  })

  // the sidebar: the bar's figures in full, the context by category, each limit's pace, the feed
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const live = await read($, snap)
    const sim = await read($, demo)
    const T = themeOf(await read($, theme))
    const history = await read($, burn)
    const feed = await read($, tools)
    const open = await read($, expanded)
    const isAll = await read($, allTools)
    const off = await readHidden($)
    const shows = (item: Item) => isOn(off, 'sidebar', item)
    const crew = await read($, agents)
    const clock = await read($, tick)
    const model = modelLabel(live?.model ?? '', await read($, effort), shows('effort'))
    const levels = await read($, thresholds)
    const alertOff = await read($, alertsOff)
    const { Box, Button, Text } = $.ui.resolve(e)
    if (live === null) return <Text color={T.dim}>Waiting for the first reading…</Text>
    // a heading row in its level's color with the theme's ink, from the area's FILL_FROM
    const isFilled = (area: Area, pct: number) =>
      !alertOff.includes('fill') && levelOf(levels[area], pct) >= FILL_FROM[area]
    const filledRow = (key: string, text: string, bg: string) => (
      <Text key={key} color={T.ink} backgroundColor={bg} bold>
        {fit(text, w)}
      </Text>
    )
    const s = sim === null ? live : withDemo(live, sim)

    // the rows' width inside a column of padding each side
    const w = Math.max(e.props.bodyColumns - 2 * PAD, 16)
    // the context and limit bars span the sidebar
    const barW = w
    const fg = T.dir.fg
    const heading = (text: string, rest?: RenderElement) => (
      <Text key={`head:${text}`}>
        <Text color={T.accent} bold>
          {text}
        </Text>
        {rest}
      </Text>
    )
    const rule = (key: string) => (
      <Text key={key} color={T.rule}>
        {'─'.repeat(w)}
      </Text>
    )
    const meter = (pct: number, color: string, key?: string) => {
      const [filled, empty] = bar(pct, barW)
      return (
        <Text key={key}>
          <Text color={color}>{filled}</Text>
          <Text color={T.dim}>{empty}</Text>
        </Text>
      )
    }

    const git = s.git

    const ctxPct = s.contextPercent === undefined ? undefined : Math.round(s.contextPercent)
    const parts = s.parts ?? []
    const nameW = Math.min(14, Math.max(...parts.map(p => p.name.length), 4))
    const partBarW = Math.max(w - nameW - 9, 3)
    const largest = parts[0]?.tokens ?? 1

    // one block per limit, an empty line parting them
    const limitRows = (['five_hour', 'seven_day'] as const)
      .filter(kind => s.limits.some(x => x.kind === kind) && shows(kind))
      .flatMap((kind, i) => {
        const l = s.limits.find(x => x.kind === kind)!
        const pct = Math.round(l.percent)
        const color = levelColor(T, levels[kind], pct)
        const cd = shows(`${kind}_reset`) ? fmtCountdown(l.resetsAt, s.now) : ''
        const label = kind === 'five_hour' ? 'last hour' : 'this week'
        const pace =
          sim === null && shows(`${kind}_pace`)
            ? forecast(l.percent, paceRate(kind, l, history, s.now), l.resetsAt, s.now, label)
            : ''
        // too wide for one row, the outcome goes on its own
        const paceLines = pace.length <= w ? [pace] : pace.split(' · ').map((p, j) => (j ? `· ${p}` : p))
        const tag = kind === 'five_hour' ? '5h ' : '7d '
        return [
          i > 0 ? <Text key={`${kind}:gap`}> </Text> : null,
          isFilled(kind, pct) ? (
            filledRow(`${kind}:head`, ` ${tag}${ring(pct)} ${pct}%${cd ? `  ↺${cd}` : ''} `, color)
          ) : (
            <Text key={`${kind}:head`}>
              <Text color={T.label ?? color}>{tag}</Text>
              <Text color={color}>{`${ring(pct)} ${pct}%`}</Text>
              {cd ? <Text color={T.dim}>{`  ↺${cd}`}</Text> : null}
            </Text>
          ),
          <Box key={`${kind}:bar`}>{meter(pct, color)}</Box>,
          ...(pace
            ? paceLines.map((p, j) => (
                <Text key={`${kind}:pace${j}`} color={T.dim}>
                  {fit(p, w)}
                </Text>
              ))
            : []),
        ]
      })

    const ICONS = {
      run: ['●', T.warn],
      ok: ['✓', T.ok],
      error: ['✗', T.hot],
      denied: ['⊘', T.alert],
    } as const
    // the latest few, oldest first; all of them newest first, scrolled with the pane
    const shown = isAll ? [...feed].reverse() : feed.slice(-FEED)
    const toolRows = shown.flatMap(t => {
      const [icon, color] = ICONS[t.status]
      const took = t.ms === undefined ? '…' : fmtMs(t.ms)
      const lead = `${t.isAgent ? '↳ ' : ''}${icon} `
      const label = fit(`${t.tool} ${t.subject}`.trim(), Math.max(w - [...lead].length - took.length - 1, 4))
      const space = ' '.repeat(Math.max(w - [...lead].length - [...label].length - took.length, 1))
      const isOpen = open === t.id
      // a click opens the row to the call's whole text, a second closes it
      return [
        <Button
          key={`tool:${t.id}`}
          plain
          onPress={() => void update($, expanded, id => (id === t.id ? null : t.id))}
        >
          <Text color={color}>{lead}</Text>
          <Text color={fg} bold={isOpen}>
            {label}
          </Text>
          <Text color={T.dim}>{space + took}</Text>
        </Button>,
        isOpen ? (
          <Box key={`tool:${t.id}:detail`} paddingLeft={2} flexDirection="column">
            <Text color={T.dim}>{t.tool}</Text>
            <Text color={fg} wrap="wrap">
              {t.detail || '(no arguments shown)'}
            </Text>
          </Box>
        ) : null,
      ]
    })
    // switches between the latest few and all the session kept
    const kept = feed.length === HISTORY ? `the last ${HISTORY} calls` : `${feed.length} calls this session`
    const toggle = (key: string) =>
      isAll ? (
        <Button key={key} plain onPress={() => void update($, allTools, () => false)}>
          <Text color={T.label ?? T.dim}>{`◂ back to the last ${FEED}`}</Text>
        </Button>
      ) : feed.length > FEED ? (
        <Button key={key} plain onPress={() => void update($, allTools, () => true)}>
          <Text color={T.label ?? T.dim}>{`▸ all ${kept}`}</Text>
        </Button>
      ) : null

    // one row per agent: type and task, its context, its time; a click shows its transcript
    const viewed = e.props.view.agentId
    const agentRows = crew.map(a => {
      const isSessionModel = a.model !== undefined && modelName(a.model) === live.model
      const window = agentWindow(a.model, isSessionModel, s.contextWindow)
      const pct = a.contextTokens === undefined ? undefined : Math.round((a.contextTokens / window) * 100)
      const ctx = pct === undefined ? '' : `${ring(pct)} ${pct}% `
      const rest = `${a.contextTokens === undefined ? '' : `${fmtTok(a.contextTokens)} `}${fmtElapsed((clock - a.startedAt) / 1000)}`
      const right = [...ctx].length + [...rest].length
      const label = fit(`${a.type} ${a.description}`.trim(), Math.max(w - 2 - right - 1, 4))
      const space = ' '.repeat(Math.max(w - 2 - [...label].length - right, 1))
      return (
        <Button key={`agent:${a.id}`} plain onPress={() => void viewAgent($, a.id).catch(() => {})}>
          <Text color={T.warn}>● </Text>
          <Text color={fg} bold={viewed === a.id}>
            {label + space}
          </Text>
          {pct === undefined ? null : <Text color={levelColor(T, levels.context, pct)}>{ctx}</Text>}
          <Text color={T.dim}>{rest}</Text>
        </Button>
      )
    })
    const agentSection = [
      heading('AGENTS', agentRows.length ? <Text color={T.dim}>  click one to view it</Text> : undefined),
      ...agentRows,
      viewed !== undefined ? (
        <Button key="agents:main" plain onPress={() => void viewAgent($).catch(() => {})}>
          <Text color={T.label ?? T.dim}>◂ back to the main conversation</Text>
        </Button>
      ) : null,
    ]

    // each section's rows, a rule between the ones shown
    const where = [
      shows('model') ? (
        <Text key="where:model" color={T.model.bg}>
          {fit(`◆ ${model}`, w)}
        </Text>
      ) : null,
      shows('folder') ? (
        <Text key="where:dir" color={fg}>
          {fit(`⌂ ${shortenPath(s.cwd)}`, w)}
        </Text>
      ) : null,
      git && shows('git') ? (
        <Text key="where:git" color={git.isDirty ? T.gitDirty.bg : T.gitOk.bg}>
          {fit(`⎇ ${git.branch}${git.marks ? ` ${git.marks}` : ''}${git.ab ? ` ${git.ab}` : ''}`, w)}
        </Text>
      ) : null,
      git?.diff && shows('diff') ? (
        <Text key="where:diff">
          <Text color={T.dim}>{`  ${git.diff.files} file${git.diff.files === 1 ? '' : 's'} changed  `}</Text>
          <Text color={T.ok}>{`+${git.diff.added}`}</Text>
          <Text color={T.hot}>{` −${git.diff.removed}`}</Text>
        </Text>
      ) : null,
    ]
    const ctxTokens = shows('tokens')
      ? `${fmtTok(s.contextTokens ?? 0)}${s.contextWindow ? ` / ${fmtTok(s.contextWindow)}` : ''}`
      : ''
    const ctxLevel = ctxPct === undefined ? 0 : levelOf(levels.context, ctxPct)
    const context = [
      ctxPct === undefined
        ? heading('CONTEXT', <Text color={T.dim}> no reading yet</Text>)
        : isFilled('context', ctxPct)
          ? filledRow('head:CONTEXT', ` CONTEXT  ${ring(ctxPct)} ${ctxPct}%  ${ctxTokens} `, levelColor(T, levels.context, ctxPct))
          : heading(
            'CONTEXT',
            <Text>
              <Text color={levelColor(T, levels.context, ctxPct)}>{`  ${ring(ctxPct)} ${ctxPct}%  `}</Text>
              {ctxTokens ? <Text color={T.tokens}>{ctxTokens}</Text> : null}
            </Text>,
          ),
      ctxPct === undefined ? null : meter(ctxPct, levelColor(T, levels.context, ctxPct), 'ctx:bar'),
      // from orange, what to do about it
      ctxPct !== undefined && ctxLevel >= 2 && !alertOff.includes('hint') ? (
        <Text key="ctx:hint" color={levelColor(T, levels.context, ctxPct)}>
          {fit(ctxLevel >= 3 ? '→ /clear or /compact' : '→ a good point to /clear', w)}
        </Text>
      ) : null,
      ...(shows('categories') ? parts : []).map(p => (
        <Text key={`part:${p.name}`}>
          <Text color={T.dim}>{`${fit(p.name, nameW).padEnd(nameW)} ${fmtTok(p.tokens).padStart(6)}  `}</Text>
          <Text color={T.tokens}>{thinBar(p.tokens / largest, partBarW)}</Text>
        </Text>
      )),
    ]
    const limits = [
      heading('LIMITS'),
      ...(limitRows.length ? limitRows : [<Text key="limits:none" color={T.dim}>no readings yet</Text>]),
    ]
    const toolSection = [
      heading('TOOLS', toolRows.length ? <Text color={T.dim}>  click one for all of it</Text> : undefined),
      isAll ? toggle('tools:top') : null,
      isAll ? (
        <Text key="tools:kept" color={T.dim}>
          {`${kept}, newest first`}
        </Text>
      ) : null,
      ...(toolRows.length ? toolRows : [<Text key="tools:none" color={T.dim}>No tool calls yet.</Text>]),
      toggle('tools:bottom'),
    ]
    // the agents' section only while one runs, or one's transcript is in view
    const isAgentsDrawn = crew.length > 0 || viewed !== undefined
    const sections: [string, (RenderElement | null)[], boolean][] = [
      ['where', where, where.some(r => r !== null)],
      ['context', context, shows('context')],
      ['limits', limits, shows('five_hour') || shows('seven_day')],
      ['agents', agentSection, shows('agents') && isAgentsDrawn],
      ['tools', toolSection, shows('tools')],
    ]
    const rows = sections
      .filter(([, , isDrawn]) => isDrawn)
      .flatMap(([name, list], i) => [i > 0 ? rule(`${name}:rule`) : null, ...list])

    // the title on the left, the way to the settings tab on the right
    const settingsLabel = '≡ settings'
    return (
      <Box flexDirection="column" paddingX={PAD}>
        <Box key="title" flexDirection="row">
          <Text color={T.accent} bold>
            {TITLE.padEnd(Math.max(w - settingsLabel.length, TITLE.length + 1))}
          </Text>
          <Button key="open:settings" plain onPress={() => void openSettings($, terminalColumns).catch(() => {})}>
            <Text color={T.dim}>{settingsLabel}</Text>
          </Button>
        </Box>
        {rule('title:rule')}
        {sim !== null ? <Text color={T.dim}>demo: simulated usage</Text> : null}
        {rows}
      </Box>
    )
  })

  // from red, a band above the prompt per area, until it falls back; others' bands go on below
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    const live = await read($, snap)
    if (e.props.hasSurvey || live === null || (await read($, alertsOff)).includes('band')) return below
    const sim = await read($, demo)
    const s = sim === null ? live : withDemo(live, sim)
    const levels = await read($, thresholds)
    const red = AREAS.filter(area => {
      const pct = percentOf(s, area)
      return pct !== undefined && levelOf(levels[area], pct) === 3
    })
    if (!red.length) return below
    const T = themeOf(await read($, theme))
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {red.map(area => (
          <Text key={`band:${area}`} color={T.ink} backgroundColor={T.hot} bold>
            {` ▲ ${alertText(s, area, 3)} `}
          </Text>
        ))}
        {below}
      </Box>
    )
  })

  // the settings tab: theme, what is drawn, the items table, alerts, thresholds, the session's name
  on('ui.render', { component: 'Pane', requestId: SETTINGS }, async ($, e) => {
    const T = themeOf(await read($, theme))
    const current = await read($, theme)
    const shown = await read($, show)
    const off = await readHidden($)
    const levels = await read($, thresholds)
    const alertOff = await read($, alertsOff)
    const elements = $.ui.resolve(e)
    const { Box, Button, Text } = elements
    // the mobile app draws no field: there the thresholds and rename rows are left out
    const Input = 'Input' in elements ? elements.Input : undefined
    const fg = T.dir.fg
    const heading = (text: string) => (
      <Text key={`h:${text}`} color={T.accent} bold>
        {text}
      </Text>
    )
    const gap = (key: string) => <Text key={`gap:${key}`}> </Text>
    // a radio row picks one of several, a check row switches one thing on or off
    const choice = (key: string, isOn: boolean, label: string, onPress: () => void, note?: string) => (
      <Button key={key} plain onPress={onPress}>
        <Text color={isOn ? T.ok : T.dim}>{isOn ? '● ' : '○ '}</Text>
        <Text color={fg} bold={isOn}>
          {label}
        </Text>
        {note ? <Text color={T.dim}>{`  ${note}`}</Text> : null}
      </Button>
    )
    // a table cell: the item switched on or off in one place; dimmed while the item it is a
    // part of is off there, blank where the place cannot draw it
    const cell = (place: Place, row: (typeof ITEMS)[number]) => {
      if (!row.places.includes(place)) return <Text key={`cell:${place}:${row.item}`}>{'   '}</Text>
      const isChecked = !off[place].includes(row.item)
      const isLive = row.parent === undefined || isOn(off, place, row.parent)
      return (
        <Button key={`cell:${place}:${row.item}`} plain onPress={() => void toggle($, place, row.item).catch(() => {})}>
          <Text color={isChecked && isLive ? T.ok : T.dim}>{isChecked ? '[x]' : '[ ]'}</Text>
        </Button>
      )
    }
    const table = [
      <Text key="items:head">
        <Text color={T.accent} bold>
          {'ITEMS'.padEnd(NAME_W)}
        </Text>
        <Text color={T.dim}>sidebar  bar</Text>
      </Text>,
      ...ITEMS.map(row => (
        <Box key={`item:${row.item}`} flexDirection="row">
          <Text color={fg}>{`${row.parent ? '  ' : ''}${row.label}`.padEnd(NAME_W + 2)}</Text>
          {cell('sidebar', row)}
          <Text>{'    '}</Text>
          {cell('bar', row)}
        </Box>
      )),
    ]

    return (
      <Box flexDirection="column" paddingX={PAD}>
        {heading('THEME')}
        {(Object.keys(THEMES) as ThemeName[]).map(name =>
          choice(`theme:${name}`, name === current, name, () => void setTheme($, name).catch(() => {})),
        )}
        {gap('theme')}
        {heading('SHOW')}
        {(Object.keys(SHOWS) as Show[]).map(name =>
          choice(`show:${name}`, name === shown, name, () => void setShow($, name, terminalColumns).catch(() => {})),
        )}
        {gap('show')}
        {table}
        {gap('items')}
        {heading('ALERTS')}
        {(Object.keys(ALERTS) as Alert[]).map(alert => (
          <Button key={`alert:${alert}`} plain onPress={() => void toggleAlert($, alert).catch(() => {})}>
            <Text color={alertOff.includes(alert) ? T.dim : T.ok}>{alertOff.includes(alert) ? '[ ] ' : '[x] '}</Text>
            <Text color={fg}>{ALERTS[alert]}</Text>
          </Button>
        ))}
        {gap('alerts')}
        {Input ? heading('THRESHOLDS') : null}
        {Input ? <Text color={T.dim}>yellow,orange,red · empty for /config's</Text> : null}
        {Input
          ? AREAS.map(area => (
              <Input
                key={`levels:${area}`}
                label={`${area === 'context' ? 'context' : area === 'five_hour' ? '5h' : '7d'}`.padEnd(8)}
                value={fmtLevels(levels[area])}
                submitLabel="set"
                onSubmit={(value: string) => {
                  const text = value.trim()
                  const next = readLevels(text)
                  if (text && !next) $.ui.toast('wbx-hud: three ascending percentages, like 20,30,50')
                  else void setLevels($, area, next, base).catch(() => {})
                }}
              />
            ))
          : null}
        {Input ? gap('thresholds') : null}
        {Input ? heading('SESSION') : null}
        {Input ? (
          <Input
            key="rename"
            label="name "
            placeholder="rename this session"
            submitLabel="rename"
            onSubmit={(value: string) => {
              const name = value.trim()
              // runs /rename as if typed, once the session is idle
              if (name)
                void $.command
                  .run({ command: 'rename', args: name })
                  .catch(() => $.ui.toast('wbx-hud: /rename is not available'))
            }}
          />
        ) : null}
        {Input ? gap('session') : null}
        <Button key="close" plain onPress={() => void $.ui.close({ id: SETTINGS }).catch(() => {})}>
          <Text color={T.dim}>✕ close (Esc)</Text>
        </Button>
      </Box>
    )
  })
}
