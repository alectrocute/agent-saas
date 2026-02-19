export function deepMerge<T extends object>(target: T, source: unknown): T {
  if (source == null || typeof source !== 'object') return target
  const out = { ...target } as T
  for (const key of Object.keys(source as object)) {
    const t = (target as Record<string, unknown>)[key]
    const s = (source as Record<string, unknown>)[key]
    if (s != null && typeof s === 'object' && !Array.isArray(s) && t != null && typeof t === 'object' && !Array.isArray(t)) {
      (out as Record<string, unknown>)[key] = deepMerge({ ...t } as object, s) as T[keyof T]
    } else if (s !== undefined) {
      (out as Record<string, unknown>)[key] = s as T[keyof T]
    }
  }
  return out
}

export function getByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

export function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let cur = obj as Record<string, unknown>
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i]
    const next = parts[i + 1]
    if (cur[p] == null || typeof cur[p] !== 'object') {
      cur[p] = next && /^\d+$/.test(next) ? [] : {}
    }
    cur = cur[p] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v)
}
