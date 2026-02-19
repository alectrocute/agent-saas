import { setHeader, setResponseStatus } from 'h3'
import { getEmailAndInstanceId } from '../../utils/instanceId'

export default defineEventHandler(async (event) => {
  const instanceUrl = event.context.cloudflare?.env?.INSTANCE_PUBLIC_URL
  if (!instanceUrl) throw createError({ statusCode: 502, message: 'INSTANCE_PUBLIC_URL not bound' })

  const { instanceId } = await getEmailAndInstanceId(event)

  const target = new URL('/health', instanceUrl)
  target.searchParams.set('instanceId', instanceId)

  const res = await fetch(target.toString(), {
    signal: AbortSignal.timeout(30_000),
  })

  setResponseStatus(event, res.status, res.statusText)
  for (const [key, value] of res.headers) {
    const k = key.toLowerCase()
    // Don't forward hop-by-hop or encoding/length headers; undici may decompress.
    if (k === 'transfer-encoding' || k === 'content-encoding' || k === 'content-length' || k === 'connection') continue
    setHeader(event, key, value)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await res.json()) as unknown
  }
  return await res.text()
})
