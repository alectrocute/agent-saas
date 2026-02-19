import {
  BACKUP_NEXT_AT_KEY,
  CRON_BACKUP_ALARM_MS,
  KEEPALIVE_INTERVAL_MS,
  KEEPALIVE_NEXT_AT_KEY,
  USER_REQUESTED_STOP_KEY,
} from './constants.js'
import { restoreAllPersisted } from './persist.js'
import { requireMethod } from './helpers.js'

export async function handleStart(request, container) {
  const methodErr = requireMethod(request, 'POST')
  if (methodErr) return methodErr

  if (container.container?.running) {
    return Response.json({ ok: true, message: 'Instance is already running' })
  }

  try {
    await container.ctx.storage.delete(USER_REQUESTED_STOP_KEY)
    await container.startAndWaitForPorts()
  } catch (error) {
    return Response.json({ ok: false, message: 'Failed to start instance', error: error.message }, { status: 500 })
  }

  const baseUrl = new URL(request.url)
  baseUrl.pathname = '/internal/persist'
  baseUrl.search = ''
  await restoreAllPersisted(container, baseUrl.toString())

  baseUrl.pathname = '/internal/start-gateway'
  await container.proxy(new Request(baseUrl.toString(), { method: 'POST' }))

  const now = Date.now()
  await container.ctx.storage.put(BACKUP_NEXT_AT_KEY, now + CRON_BACKUP_ALARM_MS)
  if (await container.getKeepAliveEnabled()) {
    await container.ctx.storage.put(KEEPALIVE_NEXT_AT_KEY, now + KEEPALIVE_INTERVAL_MS)
  }
  await container.scheduleNextAlarm()

  return Response.json({ ok: true, message: 'Instance started successfully!' })
}
