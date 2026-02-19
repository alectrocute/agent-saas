import type { H3Event } from 'h3'
import { createError } from 'h3'

export function getDb(event: H3Event) {
  return event.context.cloudflare?.env?.picohost ?? null
}

export function requireDb(event: H3Event): NonNullable<ReturnType<typeof getDb>> {
  const db = getDb(event)
  if (!db) throw createError({ statusCode: 502, message: 'DB not bound' })
  return db
}
