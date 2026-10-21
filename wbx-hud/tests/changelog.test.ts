import { describe, expect, test } from 'claude-code/testing'

import { isUpdate, manifestVersion, parseChangelog } from '../hooks/changelog'

const LOG = [
  '# Changelog',
  '',
  'What changed, newest first.',
  '',
  '## 0.10.1 — 2026-10-21',
  '',
  '- A toast says what `changed`,',
  '  wrapped.',
  '- This changelog.',
  '',
  '## 0.10.0',
  '',
  '* Themed panes.',
  '',
  '## 0.9.9 - 2026-10-01',
  '',
  'Prose only.',
].join('\r\n')

describe('manifestVersion', () => {
  test('reads the version a plugin.json states', async () => {
    expect(manifestVersion('{ "name": "wbx-hud", "version": "0.10.1" }')).toBe('0.10.1')
  })

  test('null without one, or for text that is not JSON', async () => {
    expect(manifestVersion('{ "name": "wbx-hud" }')).toBeNull()
    expect(manifestVersion('{ "version": 3 }')).toBeNull()
    expect(manifestVersion('nope')).toBeNull()
    expect(manifestVersion('null')).toBeNull()
  })
})

describe('parseChangelog', () => {
  test('a release per section, newest first, wrapped bullets joined, backticks dropped', async () => {
    expect(parseChangelog(LOG)).toEqual([
      { version: '0.10.1', date: '2026-10-21', lines: ['A toast says what changed, wrapped.', 'This changelog.'] },
      { version: '0.10.0', date: '', lines: ['Themed panes.'] },
      { version: '0.9.9', date: '2026-10-01', lines: [] },
    ])
  })

  test('nothing from an empty or headless text', async () => {
    expect(parseChangelog('')).toEqual([])
    expect(parseChangelog('- a bullet before any version')).toEqual([])
  })
})

describe('isUpdate', () => {
  test('a version seen before that differs', async () => {
    expect(isUpdate('0.10.0', '0.10.1', true)).toBe(true)
    expect(isUpdate('0.10.1', '0.10.1', true)).toBe(false)
  })

  test('none seen: an earlier install that stored a reading, not a new one', async () => {
    expect(isUpdate(undefined, '0.10.1', true)).toBe(true)
    expect(isUpdate(undefined, '0.10.1', false)).toBe(false)
  })
})
