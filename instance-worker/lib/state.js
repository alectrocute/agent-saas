import { CONFIG_STORAGE_KEY } from './constants.js'
import { requireMethod } from './helpers.js'

export async function handleState(request, container) {
  const methodErr = requireMethod(request, 'GET')

  if (methodErr) {
    return methodErr
  }

  const state = await container.state.getState()
  const configJson = await container.ctx.storage.get(CONFIG_STORAGE_KEY)
  const keepAliveEnabled = await container.getKeepAliveEnabled()

  return Response.json({
    ...state,
    config_present: Boolean(configJson),
    running: Boolean(container.container?.running),
    keep_alive: keepAliveEnabled,
  })
}
