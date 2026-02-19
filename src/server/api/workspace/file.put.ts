import { getInstanceUrl } from '../../utils/env'
import { buildInstanceUrl, throwIfNotOk } from '../../utils/instanceRequest'
import { getEmailAndInstanceId } from '../../utils/instanceId'

export default defineEventHandler(async (event) => {
  const instanceUrl = getInstanceUrl(event)
  const { instanceId } = await getEmailAndInstanceId(event)
  const body = await readBody<{ path?: string; content?: string }>(event)
  const path = body?.path?.trim()
  if (!path) throw createError({ statusCode: 400, message: 'Missing path' })
  const content = typeof body?.content === 'string' ? body.content : ''

  const url = buildInstanceUrl(instanceUrl, '/internal/workspace', instanceId)
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path, content }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) await throwIfNotOk(res, 'Workspace put', { use4xxStatus: true })
  return (await res.json()) as { ok: boolean }
})
