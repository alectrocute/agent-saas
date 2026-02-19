import { requireMethod } from './helpers.js'

export async function handleLogs(request, container) {
  const methodErr = requireMethod(request, 'GET')

  if (methodErr) return methodErr

  if (!container.container?.running) {
    return Response.json({ ok: true, truncated: false, lines: [] })
  }
  
  return container.proxy(request)
}
