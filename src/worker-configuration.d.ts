import type { D1Database } from '@cloudflare/workers-types'

export interface Env {
  picohost: D1Database
  /** Public URL of the instance Worker (picohost-instance) used to wake the container */
  INSTANCE_PUBLIC_URL?: string
  /** If set, user with this email can access admin endpoints and Admin page */
  ADMIN_EMAIL?: string
}
