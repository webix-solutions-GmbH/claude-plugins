import { describe, expect, test } from 'claude-code/testing'

import { levelOf, restoreLevels } from '../hooks/levels'
import {
  addSample,
  agentWindow,
  bar,
  burnRate,
  DETAIL_MAX,
  detailOf,
  dockColumns,
  fit,
  fmtElapsed,
  fmtMs,
  forecast,
  inputTokens,
  isOn,
  paceLevel,
  parseShortstat,
  restoreBurn,
  restoreHidden,
  toggleItem,
  subjectOf,
  thinBar,
  toolName,
  WEEK_MS,
  windowRate,
  workTimeIn,
} from '../hooks/sidebar'

const MIN = 60_000
const T0 = Date.parse('2026-10-19T12:00:00Z')

describe('agents', () => {
  test('elapsed time in minutes, hours once past one', async () => {
    expect(fmtElapsed(0)).toBe('0:00')
    expect(fmtElapsed(102.7)).toBe('1:42')
    expect(fmtElapsed(3725)).toBe('1:02:05')
  })

  test('a request counts its whole input side', async () => {
    expect(inputTokens({ input_tokens: 10, cache_read_input_tokens: 300, cache_creation_input_tokens: 2 })).toBe(312)
  })

  test("the window: the session's on its model, 1M for [1m], else 200k", async () => {
    expect(agentWindow('claude-opus-5-5[1m]', true, 1_000_000)).toBe(1_000_000)
    expect(agentWindow('claude-haiku-4-5', false, 1_000_000)).toBe(200_000)
    expect(agentWindow('claude-sonnet-5-5[1m]', false, 200_000)).toBe(1_000_000)
    expect(agentWindow(undefined, false, 1_000_000)).toBe(200_000)
  })
})

describe('levels', () => {
  test('a level per threshold reached', async () => {
    const l = { warn: 20, alert: 30, hot: 50 }
    expect([0, 20, 29, 30, 50, 100].map(p => levelOf(l, p))).toEqual([0, 1, 1, 2, 3, 3])
  })

  test('stored levels: the well-formed areas kept', async () => {
    expect(restoreLevels({ context: { warn: 10, alert: 20, hot: 40 }, five_hour: { warn: 50, alert: 20, hot: 90 }, x: 1 })).toEqual({
      context: { warn: 10, alert: 20, hot: 40 },
    })
    expect(restoreLevels('nope')).toEqual({})
  })
})

describe('hidden items', () => {
  test('a fresh install hides the pace in the bar alone', async () => {
    expect(restoreHidden(undefined)).toEqual({ sidebar: [], bar: ['five_hour_pace', 'seven_day_pace'] })
  })

  test('the sections list of before goes to the sidebar, the effort switch to both', async () => {
    expect(restoreHidden(['where', 'categories', 'nonsense'], false)).toEqual({
      sidebar: ['folder', 'git', 'model', 'categories', 'effort'],
      bar: ['five_hour_pace', 'seven_day_pace', 'effort'],
    })
  })

  test('the stored table is kept, unknown items dropped, the old effort switch ignored', async () => {
    expect(restoreHidden({ sidebar: ['tools', 'x'], bar: 'no' }, false)).toEqual({ sidebar: ['tools'], bar: [] })
  })

  test('a part is drawn while it and the item it belongs to are on', async () => {
    const h = { sidebar: ['context' as const], bar: [] }
    expect(isOn(h, 'sidebar', 'categories')).toBe(false)
    expect(isOn(h, 'bar', 'categories')).toBe(true)
    expect(isOn(toggleItem(h, 'sidebar', 'context'), 'sidebar', 'categories')).toBe(true)
  })
})

describe('burn rate', () => {
  test('percent per hour across the samples', async () => {
    expect(burnRate([{ at: T0, percent: 20 }, { at: T0 + 30 * MIN, percent: 30 }])).toBe(20)
  })

  test('none until the samples span five minutes and rise', async () => {
    expect(burnRate([])).toBeNull()
    expect(burnRate([{ at: T0, percent: 20 }, { at: T0 + 4 * MIN, percent: 30 }])).toBeNull()
    expect(burnRate([{ at: T0, percent: 20 }, { at: T0 + 30 * MIN, percent: 20 }])).toBeNull()
  })

  test('drops samples older than an hour', async () => {
    const out = addSample([{ at: T0, percent: 10 }, { at: T0 + 30 * MIN, percent: 15 }], { at: T0 + 70 * MIN, percent: 20 })
    expect(out.map(s => s.percent)).toEqual([15, 20])
  })

  test('a falling percentage is a reset and starts the history over', async () => {
    expect(addSample([{ at: T0, percent: 80 }], { at: T0 + MIN, percent: 2 })).toEqual([{ at: T0 + MIN, percent: 2 }])
  })

  test('a moved reset time is a new window even when the percentage climbed past the last', async () => {
    const was = new Date(T0 + 30 * MIN).toISOString()
    const is = new Date(T0 + 5 * 60 * MIN).toISOString()
    const s = { at: T0 + 50 * MIN, percent: 85, resetsAt: is }
    expect(addSample([{ at: T0, percent: 80, resetsAt: was }], s)).toEqual([s])
  })

  test('a reset time off by seconds is the same window', async () => {
    const was = new Date(T0 + 60 * MIN).toISOString()
    const is = new Date(T0 + 60 * MIN + 20_000).toISOString()
    const out = addSample([{ at: T0, percent: 10, resetsAt: was }], { at: T0 + MIN, percent: 11, resetsAt: is })
    expect(out.map(s => s.percent)).toEqual([10, 11])
  })
})

describe('restoreBurn', () => {
  test('keeps the well-formed readings of the last hour', async () => {
    const now = T0 + 90 * MIN
    const stored = {
      five_hour: [
        { at: T0, percent: 5 },
        { at: T0 + 40 * MIN, percent: 10, resetsAt: 'x' },
        { at: 'soon', percent: 11 },
        { at: T0 + 80 * MIN, percent: 12 },
      ],
      seven_day: [{ at: T0, percent: 3 }],
      broken: 'nope',
    }
    expect(restoreBurn(stored, now)).toEqual({
      five_hour: [
        { at: T0 + 40 * MIN, percent: 10, resetsAt: 'x' },
        { at: T0 + 80 * MIN, percent: 12 },
      ],
    })
  })

  test('nothing from what is not a record', async () => {
    expect(restoreBurn(undefined, T0)).toEqual({})
    expect(restoreBurn([1, 2], T0)).toEqual({})
    expect(restoreBurn('x', T0)).toEqual({})
  })
})

describe('forecast', () => {
  test('full before the reset', async () => {
    expect(forecast(30, 20, new Date(T0 + 5 * 3_600_000).toISOString(), T0)).toBe('+20%/h · full in 3h30m')
  })

  test('the reset comes first', async () => {
    expect(forecast(30, 20, new Date(T0 + 2 * 3_600_000).toISOString(), T0)).toBe('+20%/h · resets first')
  })

  test('slow paces keep a decimal; nothing without a rate or when full', async () => {
    expect(forecast(50, 2.5, undefined, T0)).toBe('+2.5%/h · full in 20h00m')
    expect(forecast(50, null, undefined, T0)).toBe('')
    expect(forecast(100, 20, undefined, T0)).toBe('')
  })

  test('the label follows the pace', async () => {
    expect(forecast(30, 20, new Date(T0 + 2 * 3_600_000).toISOString(), T0, 'last hour')).toBe(
      '+20%/h last hour · resets first',
    )
  })
})

describe('windowRate', () => {
  const H = 3_600_000
  test('the share used per hour since the window began', async () => {
    // a week resetting in 4 days began 72 hours ago
    const rate = windowRate(36, new Date(T0 + 4 * 24 * H).toISOString(), WEEK_MS, T0)
    expect(Math.abs((rate ?? 0) - 0.5)).toBeLessThan(1e-9)
  })

  test("none in the window's first hour, without a reset time or with nothing used", async () => {
    expect(windowRate(2, new Date(T0 + WEEK_MS - 30 * MIN).toISOString(), WEEK_MS, T0)).toBeNull()
    expect(windowRate(20, undefined, WEEK_MS, T0)).toBeNull()
    expect(windowRate(0, new Date(T0 + 24 * H).toISOString(), WEEK_MS, T0)).toBeNull()
  })

  test('a reset already past is no window', async () => {
    expect(windowRate(20, new Date(T0 - H).toISOString(), WEEK_MS, T0)).toBeNull()
  })
})

describe('paceLevel', () => {
  const H = 3_600_000
  // local times, so the work hours hold wherever the tests run; 2026-10-19 is a Monday
  const local = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime()
  const iso = (t: number) => new Date(t).toISOString()
  // a 7d limit at 50% now, full after `hours` at 50%/`hours` an hour
  const week = (now: number, hours: number, reset: number) => paceLevel('seven_day', 50, 50 / hours, iso(reset), now)

  test('ok while the limit resets first', async () => {
    expect(week(local(19, 10), 100, local(22, 10))).toBe('ok')
  })

  test('the 7d yellow when full only over a weekend', async () => {
    // full Friday 20:00, resets Monday 07:00
    expect(week(local(19, 10), 106, local(26, 7))).toBe('warn')
  })

  test('the 7d yellow while it loses at most 2 work hours, orange past them', async () => {
    // full next Wednesday at about 2:00, resets at 9:00 (1 work hour lost), then at 11:00 (3)
    expect(week(local(21, 14), 156, local(28, 9))).toBe('warn')
    expect(week(local(21, 14), 156, local(28, 11))).toBe('alert')
  })

  test('the 7d orange when work time is lost, red when full within a day', async () => {
    // full Wednesday 10:00 / Monday 20:00, resets Thursday 10:00
    expect(week(local(19, 10), 48, local(22, 10))).toBe('alert')
    expect(week(local(19, 10), 10, local(22, 10))).toBe('hot')
  })

  test('the 5h red when full within 4 hours, else orange', async () => {
    expect(paceLevel('five_hour', 30, 20, iso(T0 + 5 * H), T0)).toBe('hot')
    expect(paceLevel('five_hour', 50, 12, iso(T0 + 5 * H), T0)).toBe('alert')
  })
})

describe('workTimeIn', () => {
  const H = 3_600_000
  const local = (day: number, hour: number) => new Date(2026, 9, day, hour).getTime()

  test('weekdays from 8 to 19, no weekend', async () => {
    expect(workTimeIn(local(19, 19), local(20, 8))).toBe(0)
    expect(workTimeIn(local(19, 18), local(19, 20))).toBe(H)
    expect(workTimeIn(local(23, 19), local(26, 8))).toBe(0)
    expect(workTimeIn(local(23, 18), local(26, 9))).toBe(2 * H)
  })
})

describe('git diff stat', () => {
  test('files, insertions and deletions', async () => {
    expect(parseShortstat(' 3 files changed, 84 insertions(+), 12 deletions(-)\n')).toEqual({ files: 3, added: 84, removed: 12 })
    expect(parseShortstat(' 1 file changed, 1 deletion(-)\n')).toEqual({ files: 1, added: 0, removed: 1 })
    expect(parseShortstat('')).toBeUndefined()
  })
})

describe('tool feed labels', () => {
  test('MCP tools as server:tool', async () => {
    expect(toolName('mcp__webix-ai__list_rooms')).toBe('webix-ai:list_rooms')
    expect(toolName('Bash')).toBe('Bash')
  })

  test('the subject: a command first line, a path its last part', async () => {
    expect(subjectOf({ command: 'git status\ngit log' })).toBe('git status')
    expect(subjectOf({ file_path: 'C:\\Development\\mods\\register.tsx' })).toBe('register.tsx')
    expect(subjectOf({ pattern: 'tool\\.call', path: 'hooks' })).toBe('tool\\.call')
    expect(subjectOf({})).toBe('')
  })

  test('the detail: the argument whole, a path in full, capped', async () => {
    expect(detailOf({ command: 'git status\ngit log' })).toBe('git status\ngit log')
    expect(detailOf({ file_path: 'C:\\Development\\mods\\register.tsx' })).toBe('C:\\Development\\mods\\register.tsx')
    expect([...detailOf({ command: 'x'.repeat(5000) })].length).toBe(DETAIL_MAX)
    expect(detailOf({})).toBe('')
  })

  test('durations', async () => {
    expect(fmtMs(420)).toBe('0.4s')
    expect(fmtMs(75_000)).toBe('1m15s')
  })
})

describe('dock width', () => {
  test('a quarter of the terminal less the frame, never under 28', async () => {
    expect(dockColumns(200)).toBe(48)
    expect(dockColumns(160)).toBe(38)
    expect(dockColumns(110)).toBe(28)
  })
})

describe('drawing helpers', () => {
  test('fit cuts with an ellipsis', async () => {
    expect(fit('abcdef', 4)).toBe('abc…')
    expect(fit('abc', 4)).toBe('abc')
  })

  test('bars fill by percent', async () => {
    expect(bar(50, 10)).toEqual(['▰▰▰▰▰', '▱▱▱▱▱'])
    expect(bar(150, 4)).toEqual(['▰▰▰▰', ''])
  })

  test('thin bars in eighths, a sliver for any share', async () => {
    expect(thinBar(1, 2)).toBe('██')
    expect(thinBar(0.5, 1)).toBe('▌')
    expect(thinBar(0.001, 8)).toBe('▏')
    expect(thinBar(0, 8)).toBe('')
  })
})
