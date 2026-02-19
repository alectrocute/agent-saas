import { requireDb } from '../../utils/db'
import { getOrCreateInstanceConfig } from '../../utils/instanceConfig'
import { getEmailAndInstanceId } from '../../utils/instanceId'

export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const { email, instanceId } = await getEmailAndInstanceId(event)

  const configJson = await getOrCreateInstanceConfig(db, instanceId, email)
  
  return { config: JSON.parse(configJson) as object }
})
