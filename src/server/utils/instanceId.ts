import type { H3Event } from 'h3'
import { createError } from 'h3'

const INSTANCE_ID_LEN = 16
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Hash email to a stable instance ID [a-z0-9], 16 chars. */
export async function getInstanceIdFromEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) throw new Error('Email is required')
  if (!EMAIL_REGEX.test(normalized)) throw new Error('Invalid email format')
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized))
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, INSTANCE_ID_LEN)
}

/** Get validated email from session; throws 401 if not logged in or email invalid. */
export async function getEmailFromSession(event: H3Event): Promise<string> {
  const session = await requireUserSession(event) as any
  const raw = session.user?.email
  const email = typeof raw === 'string' && raw.length ? raw.trim().toLowerCase() : ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })
  if (!EMAIL_REGEX.test(email)) throw createError({ statusCode: 400, message: 'Invalid email format' })
  return email
}

/** Get validated email and derived instance ID from session. */
export async function getEmailAndInstanceId(
  event: H3Event
): Promise<{ email: string; instanceId: string }> {
  const email = await getEmailFromSession(event)
  const instanceId = await getInstanceIdFromEmail(email)
  return { email, instanceId }
}
