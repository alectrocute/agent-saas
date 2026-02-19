import { KEEPALIVE_INTERVAL_MS } from './constants.js'
import { requireMethod } from './helpers.js'

export async function handleKeepAlive(request, container) {
  if (request.method === 'GET') {
    return Response.json({
      enabled: await container.getKeepAliveEnabled(),
      interval_ms: KEEPALIVE_INTERVAL_MS,
      running: Boolean(container.container?.running),
    })
  }

  const methodErr = requireMethod(request, 'POST')
  if (methodErr) return methodErr

  let body
  try {
    body = await request.json()
  } catch {
    body = null
  }

  const enabled = body?.enabled
  if (typeof enabled !== 'boolean') {
    return Response.json({ ok: false, message: '`enabled` (boolean) is required' }, { status: 400 })
  }

  await container.setKeepAliveEnabled(enabled)

  return Response.json({
    ok: true,
    enabled: await container.getKeepAliveEnabled(),
    interval_ms: KEEPALIVE_INTERVAL_MS,
  })
}

