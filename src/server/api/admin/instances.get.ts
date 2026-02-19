import { requireAdmin } from '../../utils/admin'
import { requireDb } from '../../utils/db'
import { getInstanceUrl } from '../../utils/env'
import { buildInstanceUrl } from '../../utils/instanceRequest'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const db = requireDb(event)

  const { results: rows } = await db
    .prepare(
      'SELECT instance_id, email, updated_at FROM instance_configs ORDER BY updated_at DESC'
    )
    .all()

  const rowsList = (rows ?? []) as { instance_id: string; email: string | null; updated_at: string }[]
  let instanceUrl: string | null = null
  try {
    instanceUrl = getInstanceUrl(event)
  } catch {
    // optional
  }
  const instances = await Promise.all(
    rowsList.map(async (row) => {
      let state: { running?: boolean; status?: string; lastChange?: number } | null = null
      if (instanceUrl) {
        try {
          const url = buildInstanceUrl(instanceUrl, '/internal/state', row.instance_id)
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
          if (res.ok) {
            const data = (await res.json()) as { running?: boolean; status?: string; lastChange?: number }
            state = {
              running: Boolean(data.running),
              status: data.status,
              ...(typeof data.lastChange === 'number' && { lastChange: data.lastChange }),
            }
          }
        } catch {
          // ignore
        }
      }
      return {
        instance_id: row.instance_id,
        email: row.email,
        updated_at: row.updated_at,
        ...(state && { state }),
      }
    })
  )

  return { instances }
})
