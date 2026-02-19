/** Returns { admin: true } if the logged-in user's email matches ADMIN_EMAIL, else { admin: false }. */
export default defineEventHandler(async (event) => {
  const adminEmail = (event.context.cloudflare?.env as { ADMIN_EMAIL?: string } | undefined)?.ADMIN_EMAIL
  if (!adminEmail || typeof adminEmail !== 'string' || !adminEmail.trim()) {
    return { admin: false }
  }
  const session = await getUserSession(event) as any
  const email = session.user?.email?.trim().toLowerCase()
  if (!email) return { admin: false }
  return { admin: email === adminEmail.trim().toLowerCase() }
})
