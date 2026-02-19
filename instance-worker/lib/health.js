import { requireRunning, getStoredConfig, injectConfig } from './helpers.js'

const HEALTH_PATHS = ['/health', '/ready']

export async function handleHealth(request, container) {
  const pathname = new URL(request.url).pathname
  if (!HEALTH_PATHS.includes(pathname)) return null

  const runErr = requireRunning(container)
  if (runErr) return Response.json({ status: 'stopped' }, { status: 503 })

  const config = await getStoredConfig(container)
  if (config) injectConfig(container, config)

  return container.proxy(request)
}
