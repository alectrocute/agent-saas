import { getInstanceUrl } from '../../utils/env'
import { buildInstanceUrl, throwIfNotOk } from '../../utils/instanceRequest'
import { getEmailAndInstanceId } from '../../utils/instanceId'

export default defineEventHandler(async (event) => {
  const instanceUrl = getInstanceUrl(event)
  const { instanceId } = await getEmailAndInstanceId(event)

  const tailRaw = getQuery(event).tail
  const tailParsed = typeof tailRaw === 'string' ? Number.parseInt(tailRaw, 10) : 200
  const tail = Number.isFinite(tailParsed) ? Math.min(Math.max(tailParsed, 1), 2000) : 200

  const url = buildInstanceUrl(instanceUrl, '/internal/logs', instanceId)
  const target = new URL(url)
  target.searchParams.set('tail', String(tail))

  let res: Response
  try {
    res = await fetch(target.toString(), { signal: AbortSignal.timeout(5_000) })
  } catch {
    return {
      ok: true,
      instanceId,
      tail,
      result: { ok: true, truncated: false, lines: [] },
    }
  }

  if (!res.ok) {
    await throwIfNotOk(res, 'Instance logs failed')
  }

  const data = (await res.json().catch(() => null)) as unknown
  return { ok: true, instanceId, tail, result: data }
})
