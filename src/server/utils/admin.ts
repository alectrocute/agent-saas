import type { H3Event } from 'h3'
import { createError } from 'h3'
import { getEmailFromSession } from './instanceId'

/** Throws 403 if the request is not from the admin user. Returns normalized admin email. */
export async function requireAdmin(event: H3Event): Promise<string> {
  const adminEmail = (event.context.cloudflare?.env as { ADMIN_EMAIL?: string } | undefined)?.ADMIN_EMAIL
  if (!adminEmail || typeof adminEmail !== 'string' || !adminEmail.trim()) {
    throw createError({ statusCode: 403, message: 'Admin not configured' })
  }
  const normalizedAdmin = adminEmail.trim().toLowerCase()
  const email = await getEmailFromSession(event)
  if (email !== normalizedAdmin) {
    throw createError({ statusCode: 403, message: 'Admin only' })
  }
  return email
}
