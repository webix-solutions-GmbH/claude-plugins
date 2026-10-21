import type { Area, Levels } from '../types'
import type { Theme } from './themes'

export type { Area, Levels }

// a repeated value skips a level: 50,50,75 goes from green straight to orange
export const DEFAULT_LEVELS: Record<Area, Levels> = {
  context: { warn: 20, alert: 30, hot: 50 },
  five_hour: { warn: 50, alert: 70, hot: 90 },
  seven_day: { warn: 50, alert: 75, hot: 90 },
}

export const AREAS = Object.keys(DEFAULT_LEVELS) as Area[]

// "20,30,50" -> levels; undefined for anything but three ascending (or equal) numbers from 0
// to 100
export const readLevels = (value: unknown): Levels | undefined => {
  if (typeof value !== 'string') return undefined
  const parts = value.split(',').map(p => p.trim())
  if (parts.length !== 3 || parts.some(p => p === '')) return undefined
  const [warn, alert, hot] = parts.map(Number)
  if (warn === undefined || alert === undefined || hot === undefined) return undefined
  const isValid = [warn, alert, hot].every(n => Number.isFinite(n) && n >= 0 && n <= 100)
  return isValid && warn <= alert && alert <= hot ? { warn, alert, hot } : undefined
}

// as readLevels, the area's default for anything else
export const parseLevels = (value: unknown, area: Area): Levels => readLevels(value) ?? DEFAULT_LEVELS[area]

export const fmtLevels = (l: Levels) => `${l.warn},${l.alert},${l.hot}`

// the levels set in the settings tab, by area; anything malformed is left out
export const restoreLevels = (stored: unknown): Partial<Record<Area, Levels>> => {
  if (typeof stored !== 'object' || stored === null) return {}
  const out: Partial<Record<Area, Levels>> = {}
  for (const area of AREAS) {
    const l = readLevels(fmtLevelsOf((stored as Record<string, unknown>)[area]))
    if (l) out[area] = l
  }
  return out
}

const fmtLevelsOf = (x: unknown) => {
  if (typeof x !== 'object' || x === null) return undefined
  const l = x as Partial<Levels>
  return `${l.warn},${l.alert},${l.hot}`
}

// 0 below warn, 1 warn (yellow), 2 alert (orange), 3 hot (red)
export const levelOf = (levels: Levels, pct: number): 0 | 1 | 2 | 3 =>
  pct >= levels.hot ? 3 : pct >= levels.alert ? 2 : pct >= levels.warn ? 1 : 0

export const levelColor = (t: Theme, levels: Levels, pct: number) =>
  [t.ok, t.warn, t.alert, t.hot][levelOf(levels, pct)] ?? t.ok
