import { getInstanceUrl } from '../../utils/env'
import { buildInstanceUrl, throwIfNotOk } from '../../utils/instanceRequest'
import { getEmailAndInstanceId } from '../../utils/instanceId'

export default defineEventHandler(async (event) => {
  const instanceUrl = getInstanceUrl(event)
  const { instanceId } = await getEmailAndInstanceId(event)
  const path = getQuery(event).path
  if (typeof path !== 'string' || !path.trim()) {
    throw createError({ statusCode: 400, message: 'Missing path' })
  }

  const url = buildInstanceUrl(instanceUrl, '/internal/workspace', instanceId)
  const target = new URL(url)
  target.searchParams.set('path', path.trim())

  const res = await fetch(target.toString(), { method: 'DELETE', signal: AbortSignal.timeout(15_000) })
  if (!res.ok) await throwIfNotOk(res, 'Workspace delete', { use4xxStatus: true })
  return (await res.json()) as { ok: boolean }
})
