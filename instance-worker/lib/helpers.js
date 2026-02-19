import { CONFIG_STORAGE_KEY } from './constants.js'

const METHOD_NOT_ALLOWED = { status: 405 }
const INSTANCE_NOT_RUNNING = { status: 503 }
const NO_CONFIG = { status: 503 }

export function requireMethod(request, ...methods) {
  if (methods.includes(request.method)) {
    return null
  }

  return new Response('Method not allowed', METHOD_NOT_ALLOWED)
}

export function requireRunning(container) {
  if (container.container?.running) {
    return null
  }

  return new Response('Instance not running. Start it first.', INSTANCE_NOT_RUNNING)
}

export async function getStoredConfig(container) {
  const stored = await container.ctx.storage.get(CONFIG_STORAGE_KEY)
  
  return typeof stored === 'string' ? stored : null
}

export function requireConfig(container) {
  return getStoredConfig(container).then((config) => {
    if (!config) {
      return new Response('No config set. Call /internal/set-config first.', NO_CONFIG)
    }

    return config
  })
}

export function injectConfig(container, config) {
  container.envVars = { ...container.envVars, NANOBOT_CONFIG: config }
}

/** Returns error Response or null after injecting config. */
export async function ensureRunningWithConfig(container) {
  const run = requireRunning(container)

  if (run) {
    return run;
  }

  const config = await requireConfig(container)

  if (config instanceof Response){
    return config
  }

  injectConfig(container, config)

  return null
}
