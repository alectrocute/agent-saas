import { WORKSPACE_STORAGE_PREFIX } from './constants.js'
import { requireMethod, ensureRunningWithConfig } from './helpers.js'

export async function handleWorkspace(request, container) {
  const methodErr = requireMethod(request, 'GET', 'PUT', 'DELETE')
  if (methodErr) return methodErr

  const readyErr = await ensureRunningWithConfig(container)
  if (readyErr) return readyErr

  const method = request.method
  const baseUrl = new URL(request.url)
  baseUrl.pathname = '/internal/workspace'
  baseUrl.search = ''

  if (method === 'GET') {
    const storedFiles = await container.ctx.storage.list({ prefix: WORKSPACE_STORAGE_PREFIX })
    for (const [key, content] of storedFiles) {
      const path = key.slice(WORKSPACE_STORAGE_PREFIX.length)
      const putReq = new Request(baseUrl.toString(), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path, content }),
      })
      await container.proxy(putReq)
    }
  }

  if (method === 'PUT') {
    const body = await request.json()
    const path = body?.path?.trim()
    const content = typeof body?.content === 'string' ? body.content : ''
    if (path) {
      await container.ctx.storage.put(`${WORKSPACE_STORAGE_PREFIX}${path}`, content)
    }
    request = new Request(request.url, {
      method: 'PUT',
      headers: request.headers,
      body: JSON.stringify(body),
    })
  }

  if (method === 'DELETE') {
    const pathParam = new URL(request.url).searchParams.get('path')
    if (pathParam) {
      await container.ctx.storage.delete(`${WORKSPACE_STORAGE_PREFIX}${pathParam}`)
    }
  }

  return container.proxy(request)
}
