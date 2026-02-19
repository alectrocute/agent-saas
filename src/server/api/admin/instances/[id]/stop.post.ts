import { requireAdmin } from '../../../../utils/admin'
import { requireDb } from '../../../../utils/db'
import { getInstanceUrl } from '../../../../utils/env'
import { fetchInstanceOk } from '../../../../utils/instanceRequest'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const instanceId = getRouterParam(event, 'id')
  if (!instanceId?.trim()) {
    throw createError({ statusCode: 400, message: 'Missing instance id' })
  }

  const instanceUrl = getInstanceUrl(event)
  await fetchInstanceOk(instanceUrl, '/internal/stop', instanceId.trim(), {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    messagePrefix: 'Instance stop failed',
  })

  const db = requireDb(event)
  await db
    .prepare('INSERT INTO instance_runtime_events (instance_id, event) VALUES (?, ?)')
    .bind(instanceId.trim(), 'stop')
    .run()

  return { ok: true, instanceId: instanceId.trim() }
})
