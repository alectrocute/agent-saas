import { requireDb } from '../../utils/db'
import { getEmailAndInstanceId } from '../../utils/instanceId'

const DOLLARS_PER_DAY = 0.30
const SECONDS_PER_DAY = 86400

export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  const { instanceId } = await getEmailAndInstanceId(event)

  const { results } = await db
    .prepare('SELECT event, at FROM instance_runtime_events WHERE instance_id = ? ORDER BY at ASC')
    .bind(instanceId)
    .all<{ event: string; at: string }>()

  const now = new Date().toISOString()
  let totalSeconds = 0
  let startAt: string | null = null

  for (const row of results) {
    if (row.event === 'start') {
      startAt = row.at
    } else if (row.event === 'stop' && startAt !== null) {
      const end = new Date(row.at).getTime()
      const start = new Date(startAt).getTime()
      totalSeconds += Math.max(0, (end - start) / 1000)
      startAt = null
    }
  }
  if (startAt !== null) {
    const end = new Date(now).getTime()
    const start = new Date(startAt).getTime()
    totalSeconds += Math.max(0, (end - start) / 1000)
  }

  const totalBillableDays = totalSeconds / SECONDS_PER_DAY
  const totalAmount = Math.round(totalBillableDays * DOLLARS_PER_DAY * 100) / 100

  return {
    totalBillableSeconds: Math.round(totalSeconds),
    totalBillableDays: Math.round(totalBillableDays * 10000) / 10000,
    totalAmount,
    ratePerDay: DOLLARS_PER_DAY,
  }
})
