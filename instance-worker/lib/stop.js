import { requireMethod } from './helpers.js'
import { USER_REQUESTED_STOP_KEY } from './constants.js'

export async function handleStop(request, container) {
  const methodErr = requireMethod(request, 'POST')
  if (methodErr) return methodErr

  if (!container.container?.running) {
    return Response.json({ ok: true, message: 'Instance is already stopped' })
  }

  try {
    await container.ctx.storage.put(USER_REQUESTED_STOP_KEY, true)
    await container.stop()
  } catch (error) {
    return Response.json({ ok: false, message: 'Failed to stop instance', error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true, message: 'Instance stopped successfully!' })
}
