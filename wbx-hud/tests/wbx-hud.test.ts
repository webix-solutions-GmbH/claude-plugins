import { describe, expect, test } from 'claude-code/testing'

import { failureReason, fmtCountdown, fmtTok, modelName, parseGit, pillWidth, ring, withDemo } from '../hooks/register'

describe('fmtTok', () => {
  test('plain under 1000, then k and M', async () => {
    expect([0, 999, 1000, 380_000, 1_000_000].map(fmtTok)).toEqual(['0', '999', '1.0k', '380.0k', '1.0M'])
  })
})

describe('fmtCountdown', () => {
  const now = Date.parse('2026-10-19T12:00:00Z')

  test('now at or past the reset, nothing without one', async () => {
    expect(fmtCountdown('2026-10-19T12:00:00Z', now)).toBe('now')
    expect(fmtCountdown('2026-10-19T11:00:00Z', now)).toBe('now')
    expect(fmtCountdown(undefined, now)).toBe('')
  })

  test('the time left before it', async () => {
    expect(fmtCountdown('2026-10-19T15:00:00Z', now)).toBe('3h00m')
  })
})

describe('failureReason', () => {
  test("drops the engine's prefixes, keeps the reason", async () => {
    expect(failureReason('HooksError: wbx-hud: $.ui.close: pane is pinned')).toBe('pane is pinned')
    expect(failureReason('Error: no: colons: kept')).toBe('no: colons: kept')
    expect(failureReason('plain')).toBe('plain')
  })

  test('a timeout without a message', async () => {
    expect(failureReason(undefined)).toBe('no answer in time')
    expect(failureReason('HooksError: ')).toBe('no answer in time')
  })
})

describe('parseGit', () => {
  test('reads branch, dirty marks and ahead/behind', async () => {
    const out = [
      '# branch.oid 0123456789abcdef',
      '# branch.head main',
      '# branch.ab +2 -1',
      '1 M. N... 100644 100644 100644 a b src/a.ts',
      '1 .M N... 100644 100644 100644 a b src/b.ts',
      '? notes.txt',
    ].join('\n')
    expect(parseGit(out)).toEqual({ branch: 'main', marks: '+!?', ab: '⇡2⇣1', isDirty: true })
  })

  test('clean branch', async () => {
    expect(parseGit('# branch.head dev\n# branch.ab +0 -0\n')).toEqual({
      branch: 'dev',
      marks: '',
      ab: '',
      isDirty: false,
    })
  })

  test('detached head shows the short oid', async () => {
    expect(parseGit('# branch.oid 0123456789abcdef\n# branch.head (detached)\n')?.branch).toBe('0123456')
  })

  test('not a repository', async () => {
    expect(parseGit('')).toBeNull()
  })
})

describe('modelName', () => {
  test('turns model ids into readable names', async () => {
    expect(modelName('claude-opus-5-5[1m]')).toBe('Opus 5.5 (1M)')
    expect(modelName('claude-fable-5-1')).toBe('Fable 5.1')
    expect(modelName('claude-sonnet-4-5-20250929')).toBe('Sonnet 4.5')
    expect(modelName('claude-haiku-5-5')).toBe('Haiku 5.5')
  })

  test('leaves names it does not recognise readable', async () => {
    expect(modelName('Claude Opus 5.5')).toBe('Opus 5.5')
    expect(modelName('my-gateway-model')).toBe('my-gateway-model')
  })
})

describe('ring', () => {
  test('fills in quarters, empty at zero, full at and past 88', async () => {
    expect([0, 12, 13, 37, 38, 62, 63, 87, 88, 100, 140].map(ring).join('')).toBe('○○◔◔◑◑◕◕●●●')
  })
})

describe('pillWidth', () => {
  test('counts texts, caps and separators', async () => {
    expect(pillWidth([' a ', ' bc '])).toBe(3 + 4 + 2 + 1)
    expect(pillWidth([' ◑ 50% '])).toBe(7 + 2)
  })
})

describe('withDemo', () => {
  test('puts the context and both limits at the simulated percentage', async () => {
    const live = {
      cwd: 'C:/x',
      model: 'Opus 5.5',
      git: null,
      contextPercent: 10,
      contextTokens: 1000,
      limits: [{ kind: 'five_hour', percent: 3, resetsAt: '2026-10-19T15:00:00Z' }],
      now: 0,
    }
    const s = withDemo(live, 42)
    expect(s.contextPercent).toBe(42)
    expect(s.limits).toEqual([
      { kind: 'five_hour', percent: 42, resetsAt: '2026-10-19T15:00:00Z' },
      { kind: 'seven_day', percent: 42, resetsAt: undefined },
    ])
    expect(live.contextPercent).toBe(10)
  })
})
