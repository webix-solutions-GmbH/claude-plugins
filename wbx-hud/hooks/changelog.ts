// the mod's version from its plugin.json, its changes from CHANGELOG.md: the "what's new" toast
// and the changes tab

import type { Release } from '../types'

// the version a plugin.json states, or null
export const manifestVersion = (text: string): string | null => {
  try {
    const v: unknown = JSON.parse(text)?.version
    return typeof v === 'string' && v ? v : null
  } catch {
    return null
  }
}

// the `## <version> — <date>` sections, newest first as written; a bullet's indented
// continuation joins it, backticks are dropped, prose between bullets is left out
export const parseChangelog = (changelog: string): Release[] => {
  const releases: Release[] = []
  let lines: string[] | null = null
  for (const l of changelog.split(/\r?\n/)) {
    const head = /^## (\S+)(?:\s+[—-]\s+(.+))?/.exec(l)
    if (head?.[1]) {
      lines = []
      releases.push({ version: head[1], date: head[2]?.trim() ?? '', lines })
      continue
    }
    if (lines === null) continue
    const bullet = /^[-*]\s+(.+)$/.exec(l)
    if (bullet?.[1]) lines.push(bullet[1].replaceAll('`', '').trim())
    else if (/^\s+\S/.test(l) && lines.length) lines[lines.length - 1] += ` ${l.replaceAll('`', '').trim()}`
  }
  return releases
}

// whether to toast: an update from a version seen before, or from before 0.10.1, which kept no
// version but has stored a reading; a new install stays quiet
export const isUpdate = (seen: unknown, version: string, hasUsed: boolean) =>
  typeof seen === 'string' ? seen !== version : hasUsed
