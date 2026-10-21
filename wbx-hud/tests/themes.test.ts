import { describe, expect, test } from 'claude-code/testing'

import { DEFAULT_LEVELS, levelColor } from '../hooks/levels'
import { THEMES, themeOf } from '../hooks/themes'

describe('themes', () => {
  test('an unknown or missing name falls back to webix', async () => {
    expect(themeOf(undefined)).toBe(THEMES.webix)
    expect(themeOf('solarized')).toBe(THEMES.webix)
    expect(themeOf('gruvbox-dark')).toBe(THEMES['gruvbox-dark'])
  })

  test('every theme has a color for each level of the context default', async () => {
    for (const t of Object.values(THEMES)) {
      expect([0, 19, 20, 29, 30, 49, 50, 100].map(p => levelColor(t, DEFAULT_LEVELS.context, p))).toEqual([
        t.ok, t.ok, t.warn, t.warn, t.alert, t.alert, t.hot, t.hot,
      ])
    }
  })
})
