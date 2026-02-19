import type { H3Event } from 'h3'
import { createError } from 'h3'

export function getInstanceUrl(event: H3Event): string {
  const url = event.context.cloudflare?.env?.INSTANCE_PUBLIC_URL
  if (!url) throw createError({ statusCode: 502, message: 'INSTANCE_PUBLIC_URL not bound' })
  return url
}
