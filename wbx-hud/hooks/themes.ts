// A segment's background and the text drawn on it
export type Fill = { bg: string; fg: string }

export type Theme = {
  dir: Fill
  gitOk: Fill
  gitDirty: Fill
  model: Fill
  /** rounded caps with > between segments, or / for caps and separators */
  edges: 'round' | 'slant'
  /** the / between usage segments of a slanted bar that share a background (a cell has one
   * background, so a slash cannot part two); absent, or where they differ, the fill edge */
  slash?: string
  /** whether the path, git and model texts are bold */
  bold: boolean
  ctx: string
  l5h: string
  l7d: string
  /** token count beside the context ring */
  tokens: string
  /** the 5h/7d labels; absent, they take the ring's level color */
  label?: string
  dim: string
  /** ring colors by usage level, see levels.ts */
  ok: string
  warn: string
  alert: string
  hot: string
  /** text on a segment filled with a level color */
  ink: string
  /** the panes' title and headings */
  accent: string
  /** the line between the sidebar's sections */
  rule: string
}

export const THEMES = {
  // as coralline had it
  'gruvbox-dark': {
    dir: { bg: '#458588', fg: '#ebdbb2' },
    gitOk: { bg: '#689d6a', fg: '#ebdbb2' },
    gitDirty: { bg: '#d65d0e', fg: '#ebdbb2' },
    model: { bg: '#b16286', fg: '#ebdbb2' },
    edges: 'round',
    bold: true,
    ctx: '#3c3836',
    l5h: '#32302f',
    l7d: '#282828',
    tokens: '#a89984',
    dim: '#a89984',
    ok: '#b8bb26',
    warn: '#fabd2f',
    alert: '#fe8019',
    hot: '#fb4934',
    ink: '#282828',
    accent: '#8ec07c', // aqua
    rule: '#504945',
  },
  // Webix Internal design system, terminal section (Claude Design template)
  webix: {
    dir: { bg: '#3A4149', fg: '#EDEFF1' }, // wx-n-700, wx-n-100
    gitOk: { bg: '#80BA27', fg: '#15181D' }, // wx-brand-500, wx-n-950
    gitDirty: { bg: '#80BA27', fg: '#15181D' }, // the template marks dirt with * and ? only
    model: { bg: '#E67E4A', fg: '#15181D' }, // wx-accent-500, wx-n-950
    edges: 'slant',
    slash: '#3A4149', // wx-n-700, a shade above the limits' background
    bold: false,
    ctx: '#262B31', // wx-n-800
    l5h: '#1A1F26', // wx-n-900, both limits on one background as in the template
    l7d: '#1A1F26',
    tokens: '#EDEFF1', // wx-n-100
    label: '#98A0A8', // wx-n-500
    dim: '#98A0A8',
    ok: '#80BA27', // wx-brand-500
    warn: '#D9A946', // wx-warning (dark)
    alert: '#E67E4A', // wx-accent-500
    hot: '#E96C6C', // wx-error (dark)
    ink: '#15181D', // wx-n-950
    accent: '#80BA27', // wx-brand-500
    rule: '#3A4149', // wx-n-700
  },
} satisfies Record<string, Theme>

export type ThemeName = keyof typeof THEMES

export const isThemeName = (name: unknown): name is ThemeName =>
  typeof name === 'string' && Object.hasOwn(THEMES, name)

export const themeOf = (name: unknown): Theme => (isThemeName(name) ? THEMES[name] : THEMES.webix)
