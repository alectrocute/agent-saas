import { getInstanceUrl } from '../../utils/env'
import { buildInstanceUrl, throwIfNotOk } from '../../utils/instanceRequest'
import { getEmailAndInstanceId } from '../../utils/instanceId'

function fallbackStoppedState(instanceId: string) {
  const lastChange = Date.now()
  return {
    status: 'stopping',
    lastChange,
    config_present: true,
    running: false,
    instanceId,
    updated_at: new Date(lastChange).toISOString(),
    source: 'instance-worker',
  }
}

export default defineEventHandler(async (event) => {
  const instanceUrl = getInstanceUrl(event)
  const { instanceId } = await getEmailAndInstanceId(event)

  const url = buildInstanceUrl(instanceUrl, '/internal/state', instanceId)
  let res: Response
  
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(5_000) })
  } catch {
    return fallbackStoppedState(instanceId)
  }

  if (!res.ok) await throwIfNotOk(res, 'Instance state failed')

  const data = (await res.json()) as Record<string, unknown>
  const updated_at =
    typeof data.lastChange === 'number' ? new Date(data.lastChange).toISOString() : (null as string | null)
  return { ...data, instanceId, updated_at, source: 'instance-worker' }
})
