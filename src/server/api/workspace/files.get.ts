import { getInstanceUrl } from '../../utils/env'
import { buildInstanceUrl, throwIfNotOk } from '../../utils/instanceRequest'
import { getEmailAndInstanceId } from '../../utils/instanceId'

export default defineEventHandler(async (event) => {
  const instanceUrl = getInstanceUrl(event)
  const { instanceId } = await getEmailAndInstanceId(event)

  const url = buildInstanceUrl(instanceUrl, '/internal/workspace', instanceId)
  const target = new URL(url)
  target.searchParams.set('list', '1')

  const res = await fetch(target.toString(), { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) await throwIfNotOk(res, 'Workspace list', { use4xxStatus: true })
  return (await res.json()) as { ok: boolean; files: string[] }
})
