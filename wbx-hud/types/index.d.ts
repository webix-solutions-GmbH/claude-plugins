/** what `git diff --shortstat HEAD` counts: tracked files only */
export type Diff = { files: number; added: number; removed: number }
export type Git = { branch: string; marks: string; ab: string; isDirty: boolean; diff?: Diff }
export type Limit = { kind: string; percent: number; resetsAt?: string }
/** a category of the context window as /context names it, with its tokens */
export type Part = { name: string; tokens: number }
export type Snapshot = {
  cwd: string
  model: string
  git: Git | null
  contextPercent?: number
  contextTokens?: number
  contextWindow?: number
  /** the window's used categories, largest first; absent when no breakdown came back */
  parts?: Part[]
  limits: Limit[]
  costUsd?: number
  now: number
}
/** what the mod draws: the bar under the prompt, the sidebar, or both */
export type Show = 'both' | 'bar' | 'sidebar'
/** where an item is drawn */
export type Place = 'sidebar' | 'bar'
/** a row of the settings tab's table: something the sidebar or the bar draws, or a part of one */
export type Item =
  | 'folder'
  | 'git'
  | 'diff'
  | 'model'
  | 'effort'
  | 'context'
  | 'tokens'
  | 'categories'
  | 'five_hour'
  | 'five_hour_reset'
  | 'five_hour_pace'
  | 'seven_day'
  | 'seven_day_reset'
  | 'seven_day_pace'
  | 'agents'
  | 'tools'
/** the items switched off, by place */
export type Hidden = Record<Place, Item[]>
/** what has thresholds: the context and the two limits */
export type Area = 'context' | 'five_hour' | 'seven_day'
/** percentages from which an area turns warn (yellow), alert (orange), then hot (red) */
export type Levels = { warn: number; alert: number; hot: number }
/** how a level reached shows: the segment filled from orange, a /clear hint from orange, a
 * toast at orange and red, a band above the prompt at red */
export type Alert = 'fill' | 'hint' | 'toast' | 'band'
/** one reading of a limit's percentage, for its burn rate */
export type Sample = { at: number; percent: number; resetsAt?: string }
/** a tool call in the sidebar's feed */
export type ToolRun = {
  id: string
  tool: string
  /** the row's text: the main argument's first line, a path's last part */
  subject: string
  /** the main argument whole, shown when the row is clicked */
  detail: string
  /** called by a subagent, not the main conversation */
  isAgent: boolean
  startedAt: number
  ms?: number
  status: 'run' | 'ok' | 'error' | 'denied'
}
/** a subagent or teammate while its turn runs */
export type AgentRun = {
  /** its id, as $.agent.list() and its events give it */
  id: string
  /** the agent type it was spawned as (Explore, general-purpose, ...) */
  type: string
  /** the Agent call's few words of the task */
  description: string
  /** the model it runs on, as the spawn resolved it; absent until known */
  model?: string
  startedAt: number
  /** input tokens of its last request, cache included: its context; absent before one */
  contextTokens?: number
}

declare module 'claude-code' {
  interface PluginState {
    /** demo: the simulated usage percentage `/wbx-hud demo` draws, null when off */
    /** theme: the name of the theme in use, as /wbx-hud theme set it */
    /** burn: the 5h limit's readings of the last hour, by kind (five_hour); persisted under the store's "burn" */
    /** tools: the session's tool calls, oldest first, up to the last 200 */
    /** expanded: the id of the feed row clicked open, null when none is */
    /** allTools: the sidebar lists every kept call instead of the latest few */
    /** show: what is drawn, as /wbx-hud show set it */
    /** effort: the main loop's effort as last read, null before any reading */
    /** hidden: the items switched off in the sidebar and in the bar; persisted under the store's "hidden" */
    /** thresholds: each area's levels, as the settings tab set them, else the /config options; persisted under "levels" */
    /** alertsOff: the alerts switched off in the settings tab; persisted under "alertsOff" */
    /** agents: the agents whose turn runs, oldest first; one leaves when its turn ends */
    /** tick: the clock as of the last second while agents run, for their elapsed time */
    'wbx-hud': {
      snap: Snapshot | null
      demo: number | null
      theme: string
      burn: Record<string, Sample[]>
      tools: ToolRun[]
      expanded: string | null
      allTools: boolean
      show: Show
      effort: string | null
      hidden: Hidden
      thresholds: Record<Area, Levels>
      alertsOff: Alert[]
      agents: AgentRun[]
      tick: number
    }
  }
}
