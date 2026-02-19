import { handleSetConfig } from './set-config.js'
import { handleStop } from './stop.js'
import { handleStart } from './start.js'
import { handleLogs } from './logs.js'
import { handleState } from './state.js'
import { handleAgent } from './agent.js'
import { handleWorkspace } from './workspace.js'
import { handleHealth } from './health.js'
import { handleProxy } from './proxy.js'
import { handleKeepAlive } from './keepalive.js'

function route(path, handler) {
  return async (request, container) => {
    if (new URL(request.url).pathname === path) return handler(request, container)
    return null
  }
}

function handleInternalNotFound(request, _container) {
  if (new URL(request.url).pathname.startsWith('/internal/')) {
    return new Response('Not found', { status: 404 })
  }
  return null
}

export const handlers = [
  route('/internal/set-config', handleSetConfig),
  route('/internal/stop', handleStop),
  route('/internal/start', handleStart),
  route('/internal/logs', handleLogs),
  route('/internal/state', handleState),
  route('/internal/keepalive', handleKeepAlive),
  route('/internal/agent', handleAgent),
  route('/internal/workspace', handleWorkspace),
  handleHealth,
  handleInternalNotFound,
  handleProxy,
]
