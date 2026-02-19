import { requireDb } from '../../utils/db'
import { getEmailAndInstanceId } from '../../utils/instanceId'

const MAX_CONFIG_SIZE = 64 * 1024 // 64 KB

export default defineEventHandler(async (event) => {
  const db = requireDb(event)

  const { email, instanceId } = await getEmailAndInstanceId(event)

  const body = await readBody<{ config: object }>(event)

  if (!body?.config || typeof body.config !== 'object') {
    return createError({ statusCode: 400, message: 'Invalid config' })
  }

  const configJson = JSON.stringify(body.config)
  
  if (new TextEncoder().encode(configJson).length > MAX_CONFIG_SIZE) {
    return createError({ statusCode: 413, message: 'Config too large' })
  }

  const now = new Date().toISOString()

  await db
    .prepare(
      'INSERT INTO instance_configs (instance_id, config_json, updated_at, email) VALUES (?, ?, ?, ?) ON CONFLICT(instance_id) DO UPDATE SET config_json = excluded.config_json, updated_at = excluded.updated_at, email = excluded.email'
    )
    .bind(instanceId, configJson, now, email)
    .run()

  return { ok: true, instanceId }
})
