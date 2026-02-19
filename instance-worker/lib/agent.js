import { requireMethod, ensureRunningWithConfig } from './helpers.js'

export async function handleAgent(request, container) {
  const methodErr = requireMethod(request, 'POST')
  if (methodErr) return methodErr

  const readyErr = await ensureRunningWithConfig(container)
  if (readyErr) return readyErr

  return container.proxy(request)
}
