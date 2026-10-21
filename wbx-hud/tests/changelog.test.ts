import { describe, expect, test } from 'claude-code/testing'

import { isUpdate, manifestVersion, whatsNew } from '../hooks/changelog'

const LOG = [
  '# Changelog',
  '',
  '## 0.10.1 — 2026-10-21',
  '',
  '- A toast says what `changed`.',
  '- This changelog.',
  '',
  '## 0.10.0',
  '',
  '* Themed panes.',
  '',
  '## 0.9.9',
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

describe('whatsNew', () => {
  test("the first bullet of the version's section, backticks dropped", async () => {
    expect(whatsNew(LOG, '0.10.1')).toBe('A toast says what changed.')
    expect(whatsNew(LOG, '0.10.0')).toBe('Themed panes.')
  })

  test('null for a version without a section or without a bullet', async () => {
    expect(whatsNew(LOG, '0.10')).toBeNull()
    expect(whatsNew(LOG, '0.9.9')).toBeNull()
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
