import { createError } from 'h3'
import { DEFAULT_CONFIG_JSON } from './defaultConfig'
import type { getDb } from './db'

type Db = NonNullable<ReturnType<typeof getDb>>

/** Get config JSON for instance; inserts default row if missing. */
export async function getOrCreateInstanceConfig(
  db: Db,
  instanceId: string,
  email: string
): Promise<string> {
  const row = (await db
    .prepare('SELECT config_json FROM instance_configs WHERE instance_id = ?')
    .bind(instanceId)
    .first()) as { config_json: string | null } | null

  if (!row?.config_json) {
    const now = new Date().toISOString()
    await db
      .prepare(
        'INSERT INTO instance_configs (instance_id, config_json, updated_at, email) VALUES (?, ?, ?, ?)'
      )
      .bind(instanceId, DEFAULT_CONFIG_JSON, now, email)
      .run()
    return DEFAULT_CONFIG_JSON
  }
  return row.config_json
}

/** Parse config JSON and ensure it's a non-empty object; throws 400 if invalid. */
export function parseInstanceConfig(configJson: string): object {
  let obj: unknown
  try {
    obj = JSON.parse(configJson)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid config in database' })
  }
  if (typeof obj !== 'object' || obj === null || Object.keys(obj).length === 0) {
    throw createError({ statusCode: 400, message: 'Config is required (non-empty object)' })
  }
  return obj
}
