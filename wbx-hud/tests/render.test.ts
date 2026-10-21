import type { On, RenderElement } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { Snapshot } from '../types'

const snap: Snapshot = {
  cwd: 'C:/Development/Trials/Claude/mods/usage',
  model: 'Opus 5.5 (1M)',
  git: { branch: 'main', marks: '', ab: '', isDirty: false },
  contextPercent: 38,
  contextTokens: 380_000,
  limits: [
    { kind: 'five_hour', percent: 21, resetsAt: '2026-10-19T15:00:00Z' },
    { kind: 'seven_day', percent: 55, resetsAt: '2026-10-23T12:00:00Z' },
  ],
  now: Date.parse('2026-10-19T12:00:00Z'),
}

// stands in for the engine beneath the mod, then starts the session so the mod
// reads it the way it does in a real one; a theme given is in the store as a past session left it,
// as are the other entries given; the toasts shown are pushed to `toasts`; `limits` and `cost`
// stand in for another account's usage
const mountAt = async (
  $: Engine,
  on: On,
  columns: number,
  {
    isWorking = false,
    theme,
    stored = [],
    toasts = [],
    limits = snap.limits,
    cost,
  }: {
    isWorking?: boolean
    theme?: string
    stored?: [string, unknown][]
    toasts?: string[]
    limits?: Snapshot['limits']
    cost?: number
  } = {},
) => {
  on('ui.toast', (_$, e) => (toasts.push(e.text), { value: undefined }))
  on('session.cwd', () => ({ value: snap.cwd }))
  on('session.model', () => ({ value: 'claude-opus-5-5[1m]' }))
  on('session.usage', () => ({
    value: {
    startedAt: 0,
    context: { tokens: snap.contextTokens, window: 1_000_000, percent: snap.contextPercent },
    rateLimits: limits.map(l => ({ kind: l.kind, percentUsed: l.percent, resetsAt: l.resetsAt })),
    ...(cost === undefined ? {} : { cost: { usd: cost } }),
    },
  }))
  on('clock.now', () => ({ value: snap.now }))
  on('process.run', () => ({ value: { exitCode: 0, stdout: '# branch.head main', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }))
  on('clock.every', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'wbx-hud' } }))
  // the store, in memory as a session's would keep it
  const store = new Map<string, unknown>([...(theme ? ([['theme', theme]] as [string, unknown][]) : []), ...stored])
  on('store.get', (_$, e) => ({ value: store.get(e.key) }))
  on('store.set', (_$, e) => (store.set(e.key, e.value), { value: undefined }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  // the engine's own hint line
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, null, 'esc to interrupt') as RenderElement
  })
  await $.session.start({ cwd: snap.cwd, surface: 'terminal', isInteractive: true } as never)
  return $.ui.mount({
    plugin: 'wbx-hud',
    surface: 'terminal',
    component: 'PromptHint',
    props: { isDraft: false, isWorking, hint: '? for shortcuts' },
    viewport: { columns, rows: 40 },
  })
}

// each pill opens with the rounded left cap, so counting caps counts bar lines (gruvbox-dark)
const pills = (tree: string) => tree.split(String.fromCodePoint(0xe0b6)).length - 1
const ROUND = { theme: 'gruvbox-dark' }

describe('bar under the prompt', () => {
  test('one line when wide, with the engine hint below', async ($, on) => {
    const tree = JSON.stringify(await (await mountAt($, on, 200, ROUND)).drawn())
    expect(tree).toContain('Opus 5.5 (1M)')
    expect(pills(tree)).toBe(1)
    expect(tree.indexOf('Opus 5.5 (1M)')).toBeLessThan(tree.indexOf('esc to interrupt'))
  })

  test('an empty line above the bar', async ($, on) => {
    const tree = (await (await mountAt($, on, 200, ROUND)).drawn()) as unknown as { props: { marginTop?: number } }
    expect(tree.props.marginTop).toBe(1)
  })

  test('two lines when narrow', async ($, on) => {
    const tree = JSON.stringify(await (await mountAt($, on, 80, ROUND)).drawn())
    expect(pills(tree)).toBe(2)
    expect(tree).toContain('5h')
  })

  test('without rate limits (an API key) the session cost stands in for them', async ($, on) => {
    const tree = JSON.stringify(await (await mountAt($, on, 200, { limits: [], cost: 1.42 })).drawn())
    expect(tree).toContain(' $1.42 ')
    expect(tree).not.toContain('5h')
  })

  test('with rate limits the cost is left out', async ($, on) => {
    const tree = JSON.stringify(await (await mountAt($, on, 200, { cost: 1.42 })).drawn())
    expect(tree).not.toContain('$1.42')
  })

  test('stays visible while a turn runs, the engine hint kept', async ($, on) => {
    const tree = JSON.stringify(await (await mountAt($, on, 200, { isWorking: true })).drawn())
    expect(tree).toContain('Opus 5.5 (1M)')
    expect(tree).toContain('esc to interrupt')
  })
})

describe('themes in the bar', () => {
  test('webix is the default', async ($, on) => {
    const tree = JSON.stringify(await (await mountAt($, on, 200)).drawn())
    expect(tree).toContain('#E67E4A')
    expect(tree).toContain('#80BA27')
    expect(tree).not.toContain('#b16286')
  })

  test('a theme kept in the store wins over the default', async ($, on) => {
    const tree = JSON.stringify(await (await mountAt($, on, 200, ROUND)).drawn())
    expect(tree).toContain('#b16286')
    expect(tree).not.toContain('#E67E4A')
  })

  test('/wbx-hud theme gruvbox-dark switches the bar at once', async ($, on) => {
    const ui = await mountAt($, on, 200)
    const r = (await $.command.run({ command: 'wbx-hud', args: 'theme gruvbox-dark' } as never)) as { text?: string }
    expect(r.text).toContain('gruvbox-dark')
    const tree = JSON.stringify(await ui.drawn())
    expect(tree).toContain('#b16286')
    expect(tree).not.toContain('#E67E4A')
  })

  test('webix slants its edges and parts the limits with a dim slash', async ($, on) => {
    // the context unfilled, to see its own background
    const tree = JSON.stringify(await (await mountAt($, on, 200, { stored: [['alertsOff', ['fill']]] })).drawn())
    expect(pills(tree)).toBe(0)
    expect(tree).toContain(String.fromCodePoint(0xe0ba))
    expect(tree).toContain(String.fromCodePoint(0xe0bc))
    // context changes color along the slant, 5h / 7d share a background and get the slash
    expect(tree.split(String.fromCodePoint(0xe0bb)).length - 1).toBe(1)
    expect(tree).toContain('#3A4149')
    expect(tree).toContain('#262B31')
  })

  test('/wbx-hud theme lists the themes and marks the one in use', async ($, on) => {
    await mountAt($, on, 200)
    const r = (await $.command.run({ command: 'wbx-hud', args: 'theme' } as never)) as { text?: string }
    expect(r.text).toContain('* webix')
    expect(r.text).toContain('  gruvbox-dark')
  })

  test('an unknown theme is refused and changes nothing', async ($, on) => {
    const ui = await mountAt($, on, 200, ROUND)
    const r = (await $.command.run({ command: 'wbx-hud', args: 'theme solarized' } as never)) as { text?: string }
    expect(r.text).toContain('No theme "solarized"')
    expect(JSON.stringify(await ui.drawn())).toContain('#b16286')
  })
})

describe('/wbx-hud demo', () => {
  test('pins the rings at a percentage, marks the bar, and ends with off', async ($, on) => {
    const ui = await mountAt($, on, 200)
    const run = (args: string) =>
      $.command.run({ command: 'wbx-hud', args } as never) as Promise<{ text?: string }>

    expect((await run('demo 35')).text).toContain('35%')
    let tree = JSON.stringify(await ui.drawn())
    expect(tree).toContain('35%')
    expect(tree).toContain(' demo ')

    await run('demo off')
    tree = JSON.stringify(await ui.drawn())
    expect(tree).toContain('38%')
    expect(tree).not.toContain(' demo ')
  })

  test('anything else answers with the usage', async ($, on) => {
    await mountAt($, on, 200)
    const r = (await $.command.run({ command: 'wbx-hud', args: '' } as never)) as { text?: string }
    expect(r.text).toContain('Usage')
  })
})

describe('thresholds per area', () => {
  // the snapshot has context 38%, 5h 21%, 7d 55%; the colors are gruvbox-dark's
  test('defaults: context orange, 5h green, 7d yellow', async ($, on) => {
    const tree = JSON.stringify(await (await mountAt($, on, 200, ROUND)).drawn())
    expect(tree).toContain('#fe8019')
    expect(tree).toContain('#b8bb26')
    expect(tree).toContain('#fabd2f')
    expect(tree).not.toContain('#fb4934')
  })

  test('a stricter 7d setting turns only the 7d ring red', { options: { sevenDayLevels: '20,30,50' } }, async ($, on) => {
    const tree = JSON.stringify(await (await mountAt($, on, 200, ROUND)).drawn())
    expect(tree).toContain('#fe8019')
    expect(tree).toContain('#b8bb26')
    expect(tree).toContain('#fb4934')
  })

  test('thresholds set in the settings tab go over the /config option', { options: { sevenDayLevels: '20,30,50' } }, async ($, on) => {
    const stored: [string, unknown][] = [['levels', { seven_day: { warn: 60, alert: 80, hot: 95 } }]]
    const tree = JSON.stringify(await (await mountAt($, on, 200, { ...ROUND, stored })).drawn())
    // 7d at 55% is green again
    expect(tree).not.toContain('#fb4934')
    expect(tree).not.toContain('#fabd2f')
  })
})

describe('alerts', () => {
  // context 38% is orange, 5h 21% green, 7d 55% yellow (gruvbox-dark)
  test('from orange the context segment is filled with its level color, and suggests /clear', async ($, on) => {
    const ui = await mountAt($, on, 200, ROUND)
    const seg = await ui.find({ key: 'ctx' })
    const tree = JSON.stringify(seg)
    expect(tree).toContain('"backgroundColor":"#fe8019"')
    expect(tree).toContain('#282828')
    expect(tree).toContain('→ /clear')
  })

  test('the context is filled from yellow already', async ($, on) => {
    const stored: [string, unknown][] = [['levels', { context: { warn: 30, alert: 40, hot: 60 } }]]
    const ui = await mountAt($, on, 200, { ...ROUND, stored })
    const tree = JSON.stringify(await ui.find({ key: 'ctx' }))
    expect(tree).toContain('"backgroundColor":"#fabd2f"')
    // the /clear hint waits for orange
    expect(tree).not.toContain('/clear')
  })

  test('a limit below orange is not filled', async ($, on) => {
    const ui = await mountAt($, on, 200, ROUND)
    expect(JSON.stringify(await ui.find({ key: 'seven_day' }))).not.toContain('"backgroundColor":"#fabd2f"')
  })

  test('fill and hint can be switched off', async ($, on) => {
    const ui = await mountAt($, on, 200, { ...ROUND, stored: [['alertsOff', ['fill', 'hint']]] })
    const tree = JSON.stringify(await ui.find({ key: 'ctx' }))
    expect(tree).not.toContain('"backgroundColor":"#fe8019"')
    expect(tree).not.toContain('/clear')
  })

  test('reaching orange toasts once, not again at the next reading', async ($, on) => {
    const toasts: string[] = []
    await mountAt($, on, 200, { toasts })
    expect(toasts).toEqual(['wbx-hud: context at 38%: a good point to /clear'])
    await $.session.measure({} as never).catch(() => {})
    await $.session.start({ cwd: snap.cwd, surface: 'terminal', isInteractive: true } as never)
    expect(toasts).toHaveLength(1)
  })

  test('a limit at red toasts with its reset, and shows the band above the prompt', async ($, on) => {
    const toasts: string[] = []
    const stored: [string, unknown][] = [['levels', { five_hour: { warn: 5, alert: 10, hot: 20 } }]]
    await mountAt($, on, 200, { toasts, stored })
    expect(toasts).toContain('wbx-hud: 5h limit at 21%, resets in 3h00m')
    const band = await $.ui.mount({
      plugin: 'wbx-hud',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} },
    })
    const tree = JSON.stringify(await band.drawn())
    expect(tree).toContain('▲ 5h limit at 21%, resets in 3h00m')
    expect(tree).not.toContain('context at')
  })

  test('a demo toasts its own crossings, marked, and leaves the real record alone', async ($, on) => {
    const toasts: string[] = []
    // the default levels: the real reading already toasted the context at orange
    await mountAt($, on, 200, { toasts })
    toasts.length = 0
    await $.command.run({ command: 'wbx-hud', args: 'demo 95' } as never)
    expect(toasts).toEqual([
      'wbx-hud demo: context at 95%: /clear or /compact',
      'wbx-hud demo: 5h limit at 95%, resets in 3h00m',
      'wbx-hud demo: 7d limit at 95%, resets in 4d00h',
    ])
    // a second demo toasts afresh; the real reading after it does not repeat its own toast
    await $.command.run({ command: 'wbx-hud', args: 'demo 35' } as never)
    expect(toasts.at(-1)).toBe('wbx-hud demo: context at 35%: a good point to /clear')
    toasts.length = 0
    await $.command.run({ command: 'wbx-hud', args: 'demo off' } as never)
    await $.session.start({ cwd: snap.cwd, surface: 'terminal', isInteractive: true } as never)
    expect(toasts).toEqual([])
  })

  test('no band below red, or with the band switched off', async ($, on) => {
    const stored: [string, unknown][] = [
      ['levels', { five_hour: { warn: 5, alert: 10, hot: 20 } }],
      ['alertsOff', ['band']],
    ]
    await mountAt($, on, 200, { stored })
    const band = await $.ui.mount({
      plugin: 'wbx-hud',
      surface: 'terminal',
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} },
    })
    expect(JSON.stringify(await band.drawn())).not.toContain('▲')
  })
})
