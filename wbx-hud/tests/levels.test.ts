import { describe, expect, test } from 'claude-code/testing'

import { DEFAULT_LEVELS, levelColor, parseLevels } from '../hooks/levels'
import { THEMES } from '../hooks/themes'

describe('parseLevels', () => {
  test('reads three ascending percentages', async () => {
    expect(parseLevels('20,30,50', 'context')).toEqual({ warn: 20, alert: 30, hot: 50 })
    expect(parseLevels(' 50, 70 ,90 ', 'context')).toEqual({ warn: 50, alert: 70, hot: 90 })
    expect(parseLevels('0,12.5,100', 'context')).toEqual({ warn: 0, alert: 12.5, hot: 100 })
  })

  test('a repeated value skips a level', async () => {
    const levels = parseLevels('50,50,75', 'context')
    const t = THEMES['gruvbox-dark']
    expect([49, 50, 74, 75].map(p => levelColor(t, levels, p))).toEqual([t.ok, t.alert, t.alert, t.hot])
  })

  test("falls back to the area's default on anything else", async () => {
    for (const bad of [undefined, 5, '', '30,20,50', '20,30', '20,30,50,70', '20,x,50', '20,,50', '-1,30,50', '20,30,101']) {
      expect(parseLevels(bad, 'context')).toEqual(DEFAULT_LEVELS.context)
      expect(parseLevels(bad, 'five_hour')).toEqual(DEFAULT_LEVELS.five_hour)
      expect(parseLevels(bad, 'seven_day')).toEqual(DEFAULT_LEVELS.seven_day)
    }
  })
})

describe('default levels', () => {
  const t = THEMES['gruvbox-dark']
  const at = (area: keyof typeof DEFAULT_LEVELS, pcts: number[]) =>
    pcts.map(p => levelColor(t, DEFAULT_LEVELS[area], p))

  test('context: yellow 20, orange 30, red 50', async () => {
    expect(at('context', [19, 20, 29, 30, 49, 50])).toEqual([t.ok, t.warn, t.warn, t.alert, t.alert, t.hot])
  })

  test('5h: yellow 50, orange 70, red 90', async () => {
    expect(at('five_hour', [49, 50, 69, 70, 89, 90])).toEqual([t.ok, t.warn, t.warn, t.alert, t.alert, t.hot])
  })

  test('7d: yellow 50, orange 75, red 90', async () => {
    expect(at('seven_day', [49, 50, 74, 75, 89, 90])).toEqual([t.ok, t.warn, t.warn, t.alert, t.alert, t.hot])
  })
})
