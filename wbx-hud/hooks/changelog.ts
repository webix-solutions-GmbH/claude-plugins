// the "what's new" toast: the mod's version from its plugin.json, its line from CHANGELOG.md

// the version a plugin.json states, or null
export const manifestVersion = (text: string): string | null => {
  try {
    const v: unknown = JSON.parse(text)?.version
    return typeof v === 'string' && v ? v : null
  } catch {
    return null
  }
}

// the first bullet under `## <version>`, backticks dropped, or null when there is none
export const whatsNew = (changelog: string, version: string): string | null => {
  const lines = changelog.split(/\r?\n/)
  const start = lines.findIndex(l => l.startsWith('## ') && l.slice(3).split(/\s/)[0] === version)
  if (start < 0) return null
  for (const l of lines.slice(start + 1)) {
    if (l.startsWith('## ')) return null
    const m = /^\s*[-*]\s+(.+)$/.exec(l)
    if (m?.[1]) return m[1].replaceAll('`', '').trim()
  }
  return null
}

// whether to toast: an update from a version seen before, or from before 0.10.1, which kept no
// version but has stored a reading; a new install stays quiet
export const isUpdate = (seen: unknown, version: string, hasUsed: boolean) =>
  typeof seen === 'string' ? seen !== version : hasUsed
