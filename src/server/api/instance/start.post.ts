import { requireDb } from '../../utils/db'
import { getInstanceUrl } from '../../utils/env'
import { getOrCreateInstanceConfig, parseInstanceConfig } from '../../utils/instanceConfig'
import { fetchInstanceOk } from '../../utils/instanceRequest'
import { getEmailAndInstanceId } from '../../utils/instanceId'

export default defineEventHandler(async (event) => {
  const db = requireDb(event)

  const { email, instanceId } = await getEmailAndInstanceId(event)

  const configJson = await getOrCreateInstanceConfig(db, instanceId, email)

  parseInstanceConfig(configJson) // validate

  const instanceUrl = getInstanceUrl(event)

  await fetchInstanceOk(instanceUrl, '/internal/set-config', instanceId, {
    method: 'POST',
    body: configJson,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })

  const res = await fetchInstanceOk(instanceUrl, '/internal/start', instanceId, {
    method: 'POST',
    signal: AbortSignal.timeout(60_000),
  })

  const data = (await res.json().catch(() => null)) as unknown

  await db
    .prepare('INSERT INTO instance_runtime_events (instance_id, event) VALUES (?, ?)')
    .bind(instanceId, 'start')
    .run()

  return { ok: true, instanceId, result: data }
})
