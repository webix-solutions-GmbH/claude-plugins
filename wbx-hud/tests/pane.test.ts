import type { On, RenderElement } from 'claude-code'
import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const CWD = 'C:/Development/Trials/Claude/mods'
const T0 = Date.parse('2026-10-19T12:00:00Z')
const PANE = {
  title: 'HUD',
  isFocused: false,
  bodyColumns: 34,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 40 },
  view: {},
} as const

// the engine beneath the mod; `at` moves the clock and the 5h reading between session starts,
// and holds the store
const setUp = (on: On) => {
  const at = {
    now: T0,
    five: 20,
    isUsageDown: false,
    opens: [] as { columns?: number }[],
    store: new Map<string, unknown>(),
    // the mod's own files, by the end of their path, and the toasts shown
    files: {
      'plugin.json': '{ "name": "wbx-hud", "version": "1.2.3" }',
      'CHANGELOG.md': '# Changelog\n\n## 1.2.3 — 2026-10-21\n\n- The `new` thing.\n- Another.\n\n## 1.2.2\n\n- Old.\n',
    } as Record<string, string>,
    toasts: [] as string[],
  }
  on('fs.read', (_$, e) => {
    const name = Object.keys(at.files).find(n => e.path.replaceAll('\\', '/').endsWith(`/${n}`))
    if (name === undefined) throw new Error(`ENOENT: ${e.path}`)
    return { value: at.files[name] ?? '' }
  })
  on('ui.toast', (_$, e) => (at.toasts.push(e.text), { value: undefined }))
  on('session.cwd', () => ({ value: CWD }))
  on('session.model', () => ({ value: 'claude-opus-5-5[1m]' }))
  on('session.usage', () => {
    if (at.isUsageDown) throw new Error('usage unavailable')
    return {
    value: {
      startedAt: 0,
      context: {
        tokens: 231_000,
        window: 1_000_000,
        percent: 23,
        breakdown: {
          categories: [
            { name: 'System prompt', tokens: 12_000, color: '', isDeferred: false, kind: 'used' },
            { name: 'Messages', tokens: 172_000, color: '', isDeferred: false, kind: 'used' },
            { name: 'Free space', tokens: 769_000, color: '', isDeferred: false, kind: 'free' },
          ],
        } as never,
      },
      rateLimits: [
        { kind: 'five_hour', percentUsed: at.five, resetsAt: new Date(T0 + 5 * 3_600_000).toISOString() },
        { kind: 'seven_day', percentUsed: 21, resetsAt: new Date(T0 + 4 * 86_400_000).toISOString() },
      ],
      cost: { usd: 1.42 },
    },
    }
  })
  on('clock.now', () => ({ value: at.now }))
  on('process.run', (_$, e) => ({
    value: {
      exitCode: 0,
      stdout: e.argv.includes('diff')
        ? ' 3 files changed, 84 insertions(+), 12 deletions(-)\n'
        : '# branch.head main\n1 .M N... 100644 100644 100644 a b hooks/register.tsx\n',
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
  on('clock.every', () => ({ value: undefined }))
  on('command.register', () => ({ value: { command: 'wbx-hud' } }))
  // the store, in memory as a session's would keep it
  const store = at.store
  on('store.get', (_$, e) => ({ value: store.get(e.key) }))
  on('store.set', (_$, e) => (store.set(e.key, e.value), { value: undefined }))
  on('ui.open', (_$, e) => (at.opens.push(e), { value: { isPlaced: true } }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  // the engine's own hint line under the bar
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, null, 'esc to interrupt') as RenderElement
  })
  return at
}

const start = ($: Engine) => $.session.start({ cwd: CWD, surface: 'terminal', isInteractive: true } as never)

// draws the bar at a width, so the mod reads the terminal's width
const mountBar = ($: Engine, columns: number) =>
  $.ui.mount({
    plugin: 'wbx-hud',
    surface: 'terminal',
    component: 'PromptHint',
    props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
    viewport: { columns, rows: 50 },
  })

// a /clear: the session `old` ends and the process goes on as `new`
const clearEngine = (on: On) => {
  let id = 'old'
  on('session.id', () => ({ value: id }))
  on('session.end', (_$, e) => ((id = 'new'), { sessionId: e.sessionId }))
}

const clear = ($: Engine) => $.session.end({ reason: 'clear', sessionId: 'old', resume: {} } as never)

const mountPane = ($: Engine) =>
  $.ui.mount({ plugin: 'wbx-hud', surface: 'terminal', component: 'Pane', requestId: 'wbx-hud', props: PANE })

describe('sidebar', () => {
  test('shows the model first, git with its diff, context by category, both limits', async ($, on) => {
    setUp(on)
    await start($)
    const tree = JSON.stringify(await (await mountPane($)).drawn())
    expect(tree.indexOf('◆ Opus 5.5 (1M)')).toBeLessThan(tree.indexOf('⌂ '))
    expect(tree).toContain('⎇ main !')
    expect(tree).toContain('3 files changed')
    expect(tree).toContain('+84')
    expect(tree).not.toContain('$1.42')
    expect(tree).toContain('231.0k / 1.0M')
    expect(tree).toContain('Messages')
    expect(tree).not.toContain('Free space')
    expect(tree).toContain('5h ')
    expect(tree).toContain('7d ')
    expect(tree).toContain('No tool calls yet.')
  })

  test('forecasts the 5h limit once readings span a while', async ($, on) => {
    const at = setUp(on)
    await start($)
    const ui = await mountPane($)
    expect(JSON.stringify(await ui.drawn())).not.toContain('last hour')
    at.now = T0 + 30 * 60_000
    at.five = 30
    await start($)
    expect(JSON.stringify(await ui.drawn())).toContain('+20%/h last hour · full in 3h30m')
    const stored = (at.store.get('burn') as Record<string, { at: number; percent: number }[]>).five_hour
    expect(stored?.at(-1)).toMatchObject({ at: T0 + 30 * 60_000, percent: 30 })
  })

  test('the 7d pace is the week so far, from the first reading', async ($, on) => {
    setUp(on)
    await start($)
    // 21% in the 72 hours since the week began
    expect(JSON.stringify(await (await mountPane($)).drawn())).toContain('+0.3%/h this week · resets first')
  })

  test('a narrow sidebar puts the outcome on a row of its own', async ($, on) => {
    setUp(on)
    await start($)
    const ui = await $.ui.mount({
      plugin: 'wbx-hud',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'wbx-hud',
      props: { ...PANE, bodyColumns: 28 },
    })
    const tree = JSON.stringify(await ui.drawn())
    expect(tree).toContain('"+0.3%/h this week"')
    expect(tree).toContain('"· resets first"')
  })

  test('a new session goes on with the stored readings of the last hour', async ($, on) => {
    const at = setUp(on)
    const resetsAt = new Date(T0 + 5 * 3_600_000).toISOString()
    at.store.set('burn', {
      five_hour: [
        { at: T0 - 90 * 60_000, percent: 2, resetsAt },
        { at: T0 - 30 * 60_000, percent: 10, resetsAt },
      ],
    })
    await start($)
    // the reading from 90 minutes ago is dropped: 10% to 20% in half an hour
    expect(JSON.stringify(await (await mountPane($)).drawn())).toContain('+20%/h last hour · full in 4h00m')
  })

  test('stored readings of an earlier limit window start over', async ($, on) => {
    const at = setUp(on)
    const before = new Date(T0 + 10 * 60_000).toISOString()
    at.store.set('burn', { five_hour: [{ at: T0 - 30 * 60_000, percent: 10, resetsAt: before }] })
    await start($)
    expect(JSON.stringify(await (await mountPane($)).drawn())).not.toContain('last hour')
  })

  test('after a /clear the stored readings go on, not start over', async ($, on) => {
    const at = setUp(on)
    clearEngine(on)
    const resetsAt = new Date(T0 + 5 * 3_600_000).toISOString()
    at.store.set('burn', { five_hour: [{ at: T0 - 30 * 60_000, percent: 10, resetsAt }] })
    // no session.start: a /clear ends the session and goes on under a new id
    await clear($)
    expect(JSON.stringify(await (await mountPane($)).drawn())).toContain('+20%/h last hour · full in 4h00m')
    expect((at.store.get('burn') as Record<string, unknown[]>).five_hour).toHaveLength(2)
  })

  test('after a /clear the settings and the last effort are back', async ($, on) => {
    const at = setUp(on)
    clearEngine(on)
    at.store.set('theme', 'gruvbox-dark')
    at.store.set('effort', 'xhigh')
    await clear($)
    const tree = JSON.stringify(await (await mountBar($, 200)).drawn())
    expect(tree).toContain('#b16286')
    expect(tree).toContain('· xhigh')
  })

  test('a session that ends otherwise restores nothing', async ($, on) => {
    const at = setUp(on)
    clearEngine(on)
    at.store.set('theme', 'gruvbox-dark')
    await $.session.end({ reason: 'prompt_input_exit', sessionId: 'old', resume: {} } as never)
    expect(JSON.stringify(await (await mountBar($, 200)).drawn())).not.toContain('#b16286')
  })

  test('the effort a request names is kept for the next session', async ($, on) => {
    const at = setUp(on)
    on('turn.step', async function* (_$, e) {
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' } as never
    })
    await start($)
    for await (const _ of $.turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', effort: 'max', messageCount: 1 })) {
    }
    expect(at.store.get('effort')).toBe('max')
  })

  test('the feed lists calls with their outcome', async ($, on) => {
    setUp(on)
    on('tool.call', (_$, e) =>
      e.tool === 'Bash' ? { result: { stdout: '' } } : { isError: true, result: 'no such file', text: 'no such file' },
    )
    await start($)
    await $.tool.call({ tool: 'Bash', command: 'git status' } as never)
    await $.tool.call({ tool: 'Read', file_path: 'C:/x/missing.ts' } as never).catch(() => {})
    const tree = JSON.stringify(await (await mountPane($)).drawn())
    expect(tree).toContain('Bash git status')
    expect(tree).toContain('✓')
    expect(tree).toContain('Read missing.ts')
    expect(tree).toContain('✗')
  })

  test('a click opens a row to the whole call, a second closes it', async ($, on) => {
    setUp(on)
    on('tool.call', () => ({ result: { stdout: '' } }))
    await start($)
    const command = 'claude plugin test wbx-hud 2>&1 | grep -E pass && echo the whole command line'
    await $.tool.call({ tool: 'Bash', command } as never)
    const ui = await mountPane($)
    expect(JSON.stringify(await ui.drawn())).not.toContain(command)
    const row = await ui.find({ type: 'Button', text: /Bash claude/ })
    expect(row?.key).toBeDefined()
    await ui.press({ key: row!.key! })
    expect(JSON.stringify(await ui.drawn())).toContain(command)
    await ui.press({ key: row!.key! })
    expect(JSON.stringify(await ui.drawn())).not.toContain(command)
  })

  test('the feed shows the last ten; a click lists every call, newest first, and back', async ($, on) => {
    setUp(on)
    on('tool.call', () => ({ result: { stdout: '' } }))
    await start($)
    for (let i = 1; i <= 12; i++) await $.tool.call({ tool: 'Bash', command: `echo ${String(i).padStart(2, '0')}` } as never)
    const ui = await mountPane($)
    let tree = JSON.stringify(await ui.drawn())
    expect(tree).not.toContain('echo 02')
    expect(tree).toContain('echo 03')
    expect(tree.indexOf('echo 03')).toBeLessThan(tree.indexOf('echo 12'))
    const all = await ui.find({ type: 'Button', text: /all 12 calls this session/ })
    await ui.press({ key: all!.key! })
    tree = JSON.stringify(await ui.drawn())
    expect(tree).toContain('12 calls this session, newest first')
    expect(tree.indexOf('echo 12')).toBeLessThan(tree.indexOf('echo 01'))
    const back = await ui.find({ type: 'Button', text: /back to the last 10/ })
    await ui.press({ key: back!.key! })
    expect(JSON.stringify(await ui.drawn())).not.toContain('echo 02')
  })

  test('an empty line parts the 5h and 7d blocks', async ($, on) => {
    setUp(on)
    await start($)
    const tree = (await (await mountPane($)).drawn()) as unknown as { children: { children?: unknown[] }[] }
    const rows = tree.children.map(r => JSON.stringify(r.children ?? []))
    const at7d = rows.findIndex(r => r.includes('7d '))
    expect(rows[at7d - 1]).toBe('[" "]')
  })

  test('opens with the title, colors the headings and rules between the sections', async ($, on) => {
    setUp(on)
    await start($)
    const tree = (await (await mountPane($)).drawn()) as unknown as { children: { children?: unknown[] }[] }
    const rows = tree.children.map(r => JSON.stringify(r))
    expect(rows[0]).toContain('webix HUD')
    expect(rows[0]).toContain(' 1.2.3')
    expect(rows[0]).toContain('≡ settings')
    expect(rows[0]).toContain('#80BA27')
    expect(rows[1]).toContain('─')
    const text = rows.join('\n')
    for (const name of ['LIMITS', 'TOOLS']) {
      expect(text).toContain(`{"color":"#80BA27","bold":true},"children":["${name}"]`)
    }
    // where, context, limits, tools: three rules between them, one under the title
    expect(rows.filter(r => r.includes('──')).length).toBe(4)
  })

  test('the title without a version when plugin.json cannot be read', async ($, on) => {
    const at = setUp(on)
    delete at.files['plugin.json']
    await start($)
    const tree = (await (await mountPane($)).drawn()) as unknown as { children: unknown[] }
    const title = JSON.stringify(tree.children[0])
    expect(title).toContain('webix HUD')
    expect(title).not.toContain('1.2.3')
    expect(at.toasts).toEqual([])
  })

  test("after an update, what's new in a toast, once", async ($, on) => {
    const at = setUp(on)
    at.store.set('seenVersion', '1.2.2')
    await start($)
    expect(at.toasts).toEqual(['wbx-hud 1.2.3: The new thing.'])
    expect(at.store.get('seenVersion')).toBe('1.2.3')
    await start($)
    expect(at.toasts).toHaveLength(1)
  })

  test('an install of before the version was kept toasts too; a new install stays quiet', async ($, on) => {
    const at = setUp(on)
    await start($)
    expect(at.toasts).toEqual([])
    expect(at.store.get('seenVersion')).toBe('1.2.3')
    at.store.delete('seenVersion')
    // burn is stored by the first session's reading
    await start($)
    expect(at.toasts).toEqual(['wbx-hud 1.2.3: The new thing.'])
  })

  test('an update without a changelog section names the version', async ($, on) => {
    const at = setUp(on)
    at.store.set('seenVersion', '1.2.2')
    delete at.files['CHANGELOG.md']
    await start($)
    expect(at.toasts).toEqual(['wbx-hud updated to 1.2.3'])
  })

  test('opens at a quarter of the terminal once the bar has read its width', async ($, on) => {
    const at = setUp(on)
    await start($)
    expect(at.opens).toEqual([])
    await mountBar($, 200)
    expect(at.opens.map(o => o.columns)).toEqual([48])
  })

  test('manual leaves it closed', { options: { sidebar: 'manual' } }, async ($, on) => {
    const at = setUp(on)
    await start($)
    await mountBar($, 200)
    expect(at.opens).toEqual([])
  })

  test('show bar: closes the sidebar, refuses to open it, and holds across sessions', async ($, on) => {
    const at = setUp(on)
    let open = true
    on('ui.panes', () => ({ value: open ? [{ id: 'wbx-hud', title: 'HUD', isShown: true, isFocused: false, isPlaced: true }] : [] }))
    on('ui.close', () => ((open = false), { value: undefined }))
    await start($)
    const set = await $.command.run({ command: 'wbx-hud', args: 'show bar' } as never)
    expect(set.text).toBe('Showing the bar under the prompt only.')
    expect(open).toBe(false)
    expect((await $.command.run({ command: 'wbx-hud', args: 'pane' } as never)).text).toContain('The sidebar is off')
    // a new session reads the choice back and opens no sidebar
    await start($)
    const bar = JSON.stringify(await (await mountBar($, 200)).drawn())
    expect(bar).toContain('Opus 5.5 (1M)')
    expect(at.opens).toEqual([])
  })

  test('show sidebar: the bar draws only the hint, the sidebar opens', async ($, on) => {
    const at = setUp(on)
    on('ui.panes', () => ({ value: [] }))
    await start($)
    await $.command.run({ command: 'wbx-hud', args: 'show sidebar' } as never)
    expect(at.opens).toHaveLength(1)
    const bar = JSON.stringify(await (await mountBar($, 200)).drawn())
    expect(bar).not.toContain('Opus 5.5 (1M)')
    expect(bar).toContain('esc to interrupt')
  })

  test('show lists the choices and refuses an unknown one', async ($, on) => {
    setUp(on)
    await start($)
    const list = (await $.command.run({ command: 'wbx-hud', args: 'show' } as never)).text
    expect(list).toContain('* both')
    expect(list).toContain('sidebar')
    expect((await $.command.run({ command: 'wbx-hud', args: 'show nothing' } as never)).text).toContain('No "nothing"')
  })

  test('a request names the effort, drawn beside the model in the bar and the sidebar', async ($, on) => {
    setUp(on)
    on('config.list', () => ({ value: [{ key: 'effortLevel', label: 'Effort', kind: 'choice', value: 'high', isLocked: false }] as never }))
    await start($)
    expect(JSON.stringify(await (await mountBar($, 200)).drawn())).toContain('◆ Opus 5.5 (1M) · high ')
    expect(JSON.stringify(await (await mountPane($)).drawn())).toContain('◆ Opus 5.5 (1M) · high')
  })

  test('at start the effort is the settings effortLevel, the environment overriding it', async ($, on) => {
    setUp(on)
    let env: string | undefined
    // a read of one key is the merged object's read, projected
    on('settings.read', () => ({ value: { effortLevel: 'medium' } }))
    on('env.get', () => ({ value: env }))
    await start($)
    expect(JSON.stringify(await (await mountBar($, 200)).drawn())).toContain('· medium ')
    env = 'xhigh'
    await start($)
    expect(JSON.stringify(await (await mountBar($, 200)).drawn())).toContain('· xhigh ')
  })

  test('a failed first reading still opens the sidebar, and the next reading fills it', async ($, on) => {
    const at = setUp(on)
    at.isUsageDown = true
    await start($)
    await mountBar($, 200)
    expect(at.opens.map(o => o.columns)).toEqual([48])
    const pane = await mountPane($)
    expect(JSON.stringify(await pane.drawn())).toContain('Waiting for the first reading')
    at.isUsageDown = false
    at.now = T0 + 31_000
    expect(JSON.stringify(await pane.drawn())).toContain('◆ Opus 5.5 (1M)')
  })

  test('/wbx-hud pane opens it, and closes it when open', async ($, on) => {
    setUp(on)
    let open = false
    on('ui.panes', () => ({ value: open ? [{ id: 'wbx-hud', title: 'HUD', isShown: true, isFocused: false, isPlaced: true }] : [] }))
    on('ui.close', () => ((open = false), { value: undefined }))
    await start($)
    expect((await $.command.run({ command: 'wbx-hud', args: 'pane' } as never)).text).toBe('Sidebar opened.')
    open = true
    expect((await $.command.run({ command: 'wbx-hud', args: 'pane' } as never)).text).toBe('Sidebar closed.')
    expect(open).toBe(false)
  })
})

// the engine's side of an agent's life: its spawn, its listing as running, its turn's start and
// end, one request's usage, the views asked for (refused with `deny`)
const agentEngine = (on: On, id: string, type = 'Explore', description = 'find hooks', status = 'running', deny?: string) => {
  const views: { agentId?: string }[] = []
  on('agent.spawn', () => ({ model: 'claude-haiku-4-5', agentId: id }))
  on('agent.list', () => ({ value: [{ id, type, description, status }] as never }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('turn.step', async function* (_$, e) {
    return {
      turnId: e.turnId,
      index: e.index,
      answer: '',
      toolUses: [],
      stopReason: 'tool_use',
      usage: { input_tokens: 10_000, cache_read_input_tokens: 30_000, cache_creation_input_tokens: 1_000, output_tokens: 500, model: 'claude-haiku-4-5' },
    } as never
  })
  on('ui.view', (_$, e) => (views.push(e), { value: deny === undefined ? {} : { deny } }))
  return views
}

const spawn = ($: Engine) =>
  $.agent.spawn({ prompt: 'find the hooks', description: 'find hooks', subagentType: 'Explore' } as never)

// one request of an agent's turn, read to its end
const step = async ($: Engine, agentId: string) => {
  for await (const _ of $.turn.step({ turnId: `t:${agentId}`, index: 0, model: 'claude-haiku-4-5', messageCount: 1, agentId })) {
  }
}

describe('agents', () => {
  test('a running agent shows in the sidebar and the bar, and leaves when its turn ends', async ($, on) => {
    const at = setUp(on)
    agentEngine(on, 'a1')
    await start($)
    const pane = await mountPane($)
    const bar = await mountBar($, 200)
    expect(JSON.stringify(await pane.drawn())).not.toContain('AGENTS')
    expect(JSON.stringify(await bar.drawn())).not.toContain('agent')

    await spawn($)
    await $.turn.start({ text: 'find the hooks', turnId: 't:a1', agentId: 'a1' })
    // past the 30 s check, which keeps an agent the engine lists as running
    at.now = T0 + 102_000
    await step($, 'a1')
    let tree = JSON.stringify(await pane.drawn())
    expect(tree).toContain('AGENTS')
    expect(tree).toContain('Explore find')
    // 41k of haiku's 200k window, a minute and 42 seconds in
    expect(tree).toContain('◔ 21% ')
    expect(tree).toContain('41.0k 1:42')
    expect(JSON.stringify(await bar.drawn())).toContain(' ↳ 1 agent ')

    await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't:a1', agentId: 'a1', reason: 'answer' })
    tree = JSON.stringify(await pane.drawn())
    expect(tree).not.toContain('AGENTS')
    expect(JSON.stringify(await bar.drawn())).not.toContain('agent')
  })

  test('an agent whose turn starts unannounced takes its type and task from the list', async ($, on) => {
    setUp(on)
    agentEngine(on, 'a2', 'general-purpose', 'review diff')
    await start($)
    await $.turn.start({ text: 'review', turnId: 't:a2', agentId: 'a2' })
    expect(JSON.stringify(await (await mountPane($)).drawn())).toContain('general-purpose review')
  })

  test('an agent the engine lists as ended leaves at the next check, though its end went unheard', async ($, on) => {
    const at = setUp(on)
    agentEngine(on, 'a5', 'Explore', 'find hooks', 'completed')
    await start($)
    await spawn($)
    const pane = await mountPane($)
    expect(JSON.stringify(await pane.drawn())).toContain('AGENTS')
    at.now = T0 + 90_000
    expect(JSON.stringify(await pane.drawn())).not.toContain('AGENTS')
  })

  test('a click on an agent shows its transcript; back returns to the main one', async ($, on) => {
    setUp(on)
    const views = agentEngine(on, 'a3')
    await start($)
    await spawn($)
    const pane = await mountPane($)
    const row = await pane.find({ type: 'Button', text: /Explore/ })
    await pane.press({ key: row!.key! })
    expect(views).toEqual([{ agentId: 'a3' }])

    await pane.unmount()
    const viewing = await $.ui.mount({
      plugin: 'wbx-hud',
      surface: 'terminal',
      component: 'Pane',
      requestId: 'wbx-hud',
      props: { ...PANE, view: { agentId: 'a3' } },
    })
    const back = await viewing.find({ type: 'Button', text: /back to the main conversation/ })
    await viewing.press({ key: back!.key! })
    expect(views).toEqual([{ agentId: 'a3' }, {}])
  })

  test('a click the engine refuses says why in a toast', async ($, on) => {
    const { toasts } = setUp(on)
    agentEngine(on, 'a6', 'Explore', 'find hooks', 'running', 'no row in the tasks list')
    await start($)
    await spawn($)
    const pane = await mountPane($)
    const row = await pane.find({ type: 'Button', text: /Explore/ })
    await pane.press({ key: row!.key! })
    expect(toasts).toEqual(['wbx-hud: no row in the tasks list'])
  })

  test('the section can be switched off in the settings', async ($, on) => {
    setUp(on)
    agentEngine(on, 'a4')
    await start($)
    await spawn($)
    const pane = await mountPane($)
    expect(JSON.stringify(await pane.drawn())).toContain('AGENTS')
    const settings = await mountSettings($)
    await settings.press({ key: 'cell:sidebar:agents' })
    expect(JSON.stringify(await pane.drawn())).not.toContain('AGENTS')
    expect(JSON.stringify(await (await mountBar($, 200)).drawn())).toContain('1 agent')
  })
})

const mountSettings = ($: Engine) =>
  $.ui.mount({
    plugin: 'wbx-hud',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'wbx-hud-settings',
    props: { ...PANE, title: 'Settings' },
  })

describe('settings tab', () => {
  test('opens from the sidebar and from /wbx-hud settings', async ($, on) => {
    const at = setUp(on)
    await start($)
    const sidebar = await mountPane($)
    const gear = await sidebar.find({ type: 'Button', text: /settings/ })
    await sidebar.press({ key: gear!.key! })
    expect((await $.command.run({ command: 'wbx-hud', args: 'settings' } as never)).text).toBe('Settings opened.')
    expect(at.opens.filter(o => (o as { id?: string }).id === 'wbx-hud-settings')).toHaveLength(2)
  })

  test('a theme picked there is drawn at once and kept', async ($, on) => {
    const at = setUp(on)
    await start($)
    const ui = await mountSettings($)
    expect(JSON.stringify(await ui.drawn())).toContain('webix')
    const row = await ui.find({ type: 'Button', text: /gruvbox-dark/ })
    await ui.press({ key: row!.key! })
    expect(at.store.get('theme')).toBe('gruvbox-dark')
    expect(JSON.stringify(await (await mountBar($, 200)).drawn())).toContain('#b16286')
  })

  test('the table has a cell per place, blank where a place cannot draw the item', async ($, on) => {
    setUp(on)
    await start($)
    const ui = await mountSettings($)
    const tree = JSON.stringify(await ui.drawn())
    expect(tree).toContain('sidebar  bar')
    expect(await ui.find({ key: 'cell:bar:folder' })).toBeDefined()
    expect(await ui.find({ key: 'cell:sidebar:tools' })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'cell:bar:tools' })).toBeUndefined()
  })

  test('the limits switched off leave the sidebar, the bar keeps them, a new session too', async ($, on) => {
    const at = setUp(on)
    await start($)
    const ui = await mountSettings($)
    await ui.press({ key: 'cell:sidebar:five_hour' })
    await ui.press({ key: 'cell:sidebar:seven_day' })
    expect(at.store.get('hidden')).toEqual({ sidebar: ['five_hour', 'seven_day'], bar: ['five_hour_pace', 'seven_day_pace'] })
    await start($)
    const tree = JSON.stringify(await (await mountPane($)).drawn())
    expect(tree).not.toContain('LIMITS')
    expect(tree).toContain('CONTEXT')
    expect(tree).toContain('TOOLS')
    expect(JSON.stringify(await (await mountBar($, 200)).drawn())).toContain(' 5h ')
  })

  test('the categories switched off leave the context with its bar', async ($, on) => {
    setUp(on)
    await start($)
    const pane = await mountPane($)
    expect(JSON.stringify(await pane.drawn())).toContain('System prompt')
    const ui = await mountSettings($)
    await ui.press({ key: 'cell:sidebar:categories' })
    const tree = JSON.stringify(await pane.drawn())
    expect(tree).toContain('CONTEXT')
    expect(tree).toContain('23%')
    expect(tree).not.toContain('System prompt')
    expect(tree).not.toContain('Messages')
  })

  test('the bar leaves out what is switched off there, the sidebar keeps it', async ($, on) => {
    setUp(on)
    await start($)
    const ui = await mountSettings($)
    for (const item of ['folder', 'git', 'tokens', 'five_hour_reset']) await ui.press({ key: `cell:bar:${item}` })
    const bar = JSON.stringify(await (await mountBar($, 200)).drawn())
    expect(bar).not.toContain('⎇')
    expect(bar).not.toContain('mods')
    expect(bar).not.toContain('231.0k')
    expect(bar).toContain('◆ Opus 5.5 (1M)')
    expect(bar).toContain(' 5h ')
    // the 7d reset still shows: one ↺ left
    expect(bar.split('↺').length).toBe(2)
    const pane = JSON.stringify(await (await mountPane($)).drawn())
    expect(pane).toContain('⎇ main')
    expect(pane).toContain('231.0k')
  })

  test('the effort can be left out of the model in one place', async ($, on) => {
    setUp(on)
    on('config.list', () => ({ value: [{ key: 'effortLevel', label: 'Effort', kind: 'choice', value: 'max', isLocked: false }] as never }))
    await start($)
    const ui = await mountSettings($)
    await ui.press({ key: 'cell:bar:effort' })
    expect(JSON.stringify(await (await mountBar($, 200)).drawn())).not.toContain('· max')
    expect(JSON.stringify(await (await mountPane($)).drawn())).toContain('· max')
  })

  test('a sections list of before is read into the sidebar column', async ($, on) => {
    const at = setUp(on)
    at.store.set('hidden', ['where', 'limits'])
    at.store.set('isEffortShown', false)
    await start($)
    const tree = JSON.stringify(await (await mountPane($)).drawn())
    expect(tree).not.toContain('⌂ ')
    expect(tree).not.toContain('LIMITS')
    expect(JSON.stringify(await (await mountBar($, 200)).drawn())).toContain(' 5h ')
  })

  test('the bar shows the pace when switched on: green while the limit resets first', async ($, on) => {
    const at = setUp(on)
    await start($)
    const ui = await mountSettings($)
    await ui.press({ key: 'cell:bar:five_hour_pace' })
    await ui.press({ key: 'cell:bar:seven_day_pace' })
    at.now = T0 + 30 * 60_000
    at.five = 30
    await start($)
    const bar = await mountBar($, 200)
    // 5h: 20% to 30% in half an hour fills before the reset; 7d: 21% over 72 hours does not
    const runs = (await bar.findAll({ type: 'Text' })).filter(t => t.text.startsWith('↗'))
    expect(runs.map(t => t.text)).toEqual(['↗20%/h ', '↗0.3%/h '])
    expect(runs[0]?.props.color).not.toBe(runs[1]?.props.color)
  })

  test('thresholds entered there apply at once and are kept; empty goes back, nonsense is refused', async ($, on) => {
    const at = setUp(on)
    const { toasts } = at
    await start($)
    const ui = await mountSettings($)
    // context 23% is yellow by default; from 10,20,40 it is orange
    await ui.input({ key: 'levels:context', text: '10, 20, 40' })
    expect(at.store.get('levels')).toEqual({ context: { warn: 10, alert: 20, hot: 40 } })
    const pane = await mountPane($)
    // webix: orange, after the reset yellow
    expect(JSON.stringify(await pane.find({ type: 'Text', text: /CONTEXT/ }))).toContain('"backgroundColor":"#E67E4A"')
    await ui.input({ key: 'levels:context', text: '50,20' })
    expect(toasts).toContain('wbx-hud: three ascending percentages, like 20,30,50')
    await ui.input({ key: 'levels:context', text: '' })
    expect(at.store.get('levels')).toEqual({})
    expect(JSON.stringify(await pane.find({ type: 'Text', text: /CONTEXT/ }))).toContain('"backgroundColor":"#D9A946"')
  })

  test('an alert switched off there is kept', async ($, on) => {
    const at = setUp(on)
    await start($)
    const ui = await mountSettings($)
    await ui.press({ key: 'alert:toast' })
    expect(at.store.get('alertsOff')).toEqual(['toast'])
  })

  test('a name entered runs /rename with it', async ($, on) => {
    setUp(on)
    const renamed: string[] = []
    on('command.run', { command: 'rename' }, (_$, e) => (renamed.push(e.args), { text: '' }))
    await start($)
    const ui = await mountSettings($)
    await ui.input({ key: 'rename', text: '  wbx-hud settings  ' })
    expect(renamed).toEqual(['wbx-hud settings'])
  })
})
