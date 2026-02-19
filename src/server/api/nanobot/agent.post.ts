import { getInstanceUrl } from '../../utils/env'
import { proxyResponseToInstance } from '../../utils/instanceRequest'
import { getEmailAndInstanceId } from '../../utils/instanceId'

export default defineEventHandler(async (event) => {
  const instanceUrl = getInstanceUrl(event)
  const { instanceId } = await getEmailAndInstanceId(event)

  const body = await readBody<{ message?: string }>(event)

  const message = (body?.message ?? '').trim()

  if (!message) {
    return createError({ statusCode: 400, message: 'Missing message' })
  }

  if (message.length > 16_384) {
    return createError({ statusCode: 413, message: 'Message too long' })
  }

  return proxyResponseToInstance(event, instanceUrl, '/internal/agent', instanceId, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message }),
    signal: AbortSignal.timeout(130_000),
  })
})
