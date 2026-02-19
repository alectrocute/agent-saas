import { CONFIG_STORAGE_KEY } from './constants.js'
import { requireMethod } from './helpers.js'

export async function handleSetConfig(request, container) {
  const methodErr = requireMethod(request, 'POST')

  if (methodErr) {
    return methodErr
  }

  const body = await request.text()

  if (!body) {
    return new Response('Missing body', { status: 400 })
  }

  let parsed

  try {
    parsed = JSON.parse(body)
  } catch {
    return new Response('Config must be valid JSON', { status: 400 })
  }

  if (typeof parsed !== 'object' || parsed === null || Object.keys(parsed).length === 0) {
    return new Response('Config is required (non-empty object) to start the instance', { status: 400 })
  }

  await container.ctx.storage.put(CONFIG_STORAGE_KEY, body)

  container.envVars = { ...container.envVars, NANOBOT_CONFIG: body }

  return Response.json({ ok: true })
}
