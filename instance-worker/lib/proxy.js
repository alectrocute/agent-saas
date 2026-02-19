import { ensureRunningWithConfig } from './helpers.js'

export async function handleProxy(request, container) {
  const readyErr = await ensureRunningWithConfig(container)

  if (readyErr) {
    return readyErr
  }
  
  return container.proxy(request)
}
