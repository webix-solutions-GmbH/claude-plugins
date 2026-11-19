import { describe, expect, test } from 'claude-code/testing'

import {
  betterName,
  dayKey,
  fmtUsd,
  isNews,
  KEEP_DAYS,
  lastDays,
  latestSessions,
  NAME_RANK,
  parseTitles,
  projectMonth,
  recordCost,
  restoreLedger,
  sparkline,
  sumDays,
} from '../hooks/cost'

const DAY = 86_400_000
// noon, so the local day is the same in any time zone a test runs in within ±11 hours
const T0 = new Date(2026, 10, 19, 12).getTime()

describe('cost ledger', () => {
  test('a malformed store gives an empty ledger, bad entries dropped', async () => {
    expect(restoreLedger(undefined)).toEqual({ days: {}, sessions: {} })
    expect(
      restoreLedger({
        days: { '2026-11-19': 2, junk: 3, '2026-11-18': -1, '2026-11-17': 'x' },
        sessions: { a: { usd: 1, at: 5 }, b: { usd: 'x', at: 5 }, c: null },
      }),
    ).toEqual({ days: { '2026-11-19': 2 }, sessions: { a: { usd: 1, at: 5 } } })
  })

  test('only the growth since the last reading counts', async () => {
    let l = recordCost({ days: {}, sessions: {} }, 's', 1, T0)
    l = recordCost(l, 's', 1, T0 + 1000)
    l = recordCost(l, 's', 1.5, T0 + 2000)
    expect(Math.round((l.days[dayKey(T0)] ?? 0) * 100)).toBe(Math.round(1.5 * 100))
    // the next day only that day's growth
    l = recordCost(l, 's', 2, T0 + DAY)
    expect(Math.round((l.days[dayKey(T0 + DAY)] ?? 0) * 100)).toBe(Math.round(0.5 * 100))
  })

  test('old days and forgotten sessions are dropped', async () => {
    const l = recordCost(
      { days: { [dayKey(T0 - KEEP_DAYS * DAY)]: 9, [dayKey(T0 - 10 * DAY)]: 1 }, sessions: { old: { usd: 5, at: T0 - 40 * DAY } } },
      's',
      1,
      T0,
    )
    expect(Object.keys(l.days).sort()).toEqual([dayKey(T0 - 10 * DAY), dayKey(T0)])
    expect(Object.keys(l.sessions)).toEqual(['s'])
  })

  test('the last days step by calendar date, across a change of summer time', async () => {
    // Europe's change back was 2026-10-25
    const days = lastDays({}, new Date(2026, 9, 27, 0, 30).getTime(), 5).map(d => d.day)
    expect(days).toEqual(['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'])
  })

  test('sums and the month projected from the first day with a cost', async () => {
    const days = { [dayKey(T0)]: 2, [dayKey(T0 - 6 * DAY)]: 5, [dayKey(T0 - 9 * DAY)]: 3 }
    expect(sumDays(days, T0, 1)).toBe(2)
    expect(sumDays(days, T0, 7)).toBe(7)
    expect(sumDays(days, T0, 30)).toBe(10)
    expect(projectMonth(days, T0)).toEqual({ usd: 30, days: 10 })
    expect(projectMonth({}, T0)).toBeNull()
  })

  test('formats dollars and draws a sparkline', async () => {
    expect(fmtUsd(0.4)).toBe('$0.40')
    expect(fmtUsd(12.346)).toBe('$12.35')
    expect(fmtUsd(1234.5)).toBe('$1,235')
    expect(sparkline([0, 1, 4, 8])).toBe(' ▁▄█')
    expect(sparkline([0, 0])).toBe('  ')
  })
})

describe('cost by session', () => {
  test('a session keeps when it started, its name and folder over later readings', async () => {
    let l = recordCost({ days: {}, sessions: {} }, 's', 1, T0, { name: 'first', folder: 'mods' })
    l = recordCost(l, 's', 2, T0 + 1000)
    expect(l.sessions.s).toEqual({ usd: 2, at: T0 + 1000, startedAt: T0, name: 'first', folder: 'mods' })
    expect(isNews(l, 's', 2)).toBe(false)
    expect(isNews(l, 's', 2, { name: 'first' })).toBe(false)
    expect(isNews(l, 's', 2, { name: 'renamed' })).toBe(true)
    expect(isNews(l, 's', 3)).toBe(true)
  })

  test('the latest sessions that cost anything, newest first', async () => {
    const l = { days: {}, sessions: { a: { usd: 1, at: 1 }, b: { usd: 0, at: 3 }, c: { usd: 2, at: 2 } } }
    expect(latestSessions(l, 10).map(s => s.id)).toEqual(['c', 'a'])
    expect(latestSessions(l, 1).map(s => s.id)).toEqual(['c'])
  })

  test('a name ranking at least as high replaces the one known', async () => {
    const p = betterName(null, '  fix   the bug ', NAME_RANK.prompt)
    expect(p).toEqual({ name: 'fix the bug', rank: 1 })
    expect(betterName(p, 'Bug fix', NAME_RANK.title)?.name).toBe('Bug fix')
    const r = betterName(p, 'mine', NAME_RANK.rename)
    expect(betterName(r, 'Bug fix', NAME_RANK.title)?.name).toBe('mine')
    expect(betterName(r, '', NAME_RANK.rename)).toBe(r)
  })

  test('the last rename and title in a transcript tail, a cut first line skipped', async () => {
    const tail = [
      'tle","aiTitle":"cut"}',
      '{"type":"ai-title","aiTitle":"One","sessionId":"x"}',
      '{"type":"user","message":"x"}',
      '{"type":"custom-title","customTitle":"mine","sessionId":"x"}',
      '{"type":"ai-title","aiTitle":"Two","sessionId":"x"}',
    ].join('\n')
    expect(parseTitles(tail)).toEqual({ rename: 'mine', title: 'Two' })
    expect(parseTitles('')).toEqual({ rename: undefined, title: undefined })
  })
})
