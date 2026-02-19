import { getEmailAndInstanceId } from '../../utils/instanceId'

export default defineEventHandler(async (event) => {
  const { email, instanceId } = await getEmailAndInstanceId(event)
  return { email, instanceId }
})
