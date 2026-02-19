import { getInstanceUrl } from '../../utils/env'
import { proxyResponseToInstance } from '../../utils/instanceRequest'
import { getEmailAndInstanceId } from '../../utils/instanceId'

export default defineEventHandler(async (event) => {
  const instanceUrl = getInstanceUrl(event)
  const { instanceId } = await getEmailAndInstanceId(event)
  return proxyResponseToInstance(event, instanceUrl, '/ready', instanceId, {
    signal: AbortSignal.timeout(30_000),
  })
})
