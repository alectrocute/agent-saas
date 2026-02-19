import { requireDb } from '../../utils/db'
import { getInstanceUrl } from '../../utils/env'
import { fetchInstanceOk } from '../../utils/instanceRequest'
import { getEmailAndInstanceId } from '../../utils/instanceId'

export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const instanceUrl = getInstanceUrl(event)
  const { instanceId } = await getEmailAndInstanceId(event)

  const res = await fetchInstanceOk(instanceUrl, '/internal/stop', instanceId, {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    messagePrefix: 'Instance stop failed',
  })

  const data = (await res.json().catch(() => null)) as unknown

  await db
    .prepare('INSERT INTO instance_runtime_events (instance_id, event) VALUES (?, ?)')
    .bind(instanceId, 'stop')
    .run()

  return { ok: true, instanceId, result: data }
})
