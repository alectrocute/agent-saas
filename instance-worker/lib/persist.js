import { PERSIST_STORAGE_PREFIX, FIXED_PERSIST_PATHS } from './constants.js'

/**
 * GET each allowed path from container and save to ctx.storage under persist:<path>.
 * Call when container is running.
 */
export async function backupAllPersisted(container, baseUrl = 'http://localhost/internal/persist') {
  if (!container.container?.running) return
  const get = async (path) => {
    const url = `${baseUrl.replace(/\/$/, '')}?path=${encodeURIComponent(path)}`
    const res = await container.proxy(new Request(url, { method: 'GET' }))
    const body = await res.text()
    await container.ctx.storage.put(`${PERSIST_STORAGE_PREFIX}${path}`, body)
  }
  for (const path of FIXED_PERSIST_PATHS) {
    try {
      await get(path)
    } catch (_) {
      // skip failed path
    }
  }
  try {
    const listUrl = `${baseUrl.replace(/\/$/, '')}?path=${encodeURIComponent('sessions')}`
    const listRes = await container.proxy(new Request(listUrl, { method: 'GET' }))
    const ids = await listRes.json()
    if (Array.isArray(ids)) {
      for (const id of ids) {
        await get(`sessions/${id}`)
      }
    }
  } catch (_) {
    // no sessions or list failed
  }
}

/**
 * Restore all persist:<path> keys from storage into the container.
 * Call after container is up.
 */
export async function restoreAllPersisted(container, baseUrl = 'http://localhost/internal/persist') {
  const list = await container.ctx.storage.list({ prefix: PERSIST_STORAGE_PREFIX })
  const base = baseUrl.replace(/\/$/, '')
  for (const [key, content] of list) {
    const path = key.slice(PERSIST_STORAGE_PREFIX.length)
    if (path === 'sessions' || typeof content !== 'string') continue
    try {
      const url = `${base}?path=${encodeURIComponent(path)}`
      await container.proxy(
        new Request(url, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: content,
        })
      )
    } catch (_) {
      // skip failed path
    }
  }
}
