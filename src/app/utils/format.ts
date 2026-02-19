export function asPrettyText(data: unknown): string {
  if (data == null) return ''
  if (typeof data === 'string') return data
  try {
    return JSON.stringify(data, null, 2)
  } catch {
    return String(data)
  }
}

export function getErrorMessage(e: unknown, fallback = 'Request failed'): string {
  if (e && typeof e === 'object') {
    const err = e as { message?: string; data?: { message?: string } }
    return err.message ?? err.data?.message ?? fallback
  }
  return fallback
}
