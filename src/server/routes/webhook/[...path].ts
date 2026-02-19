import { getRequestURL, getMethod, getRequestHeaders, getRouterParam, readRawBody, setHeader, setResponseStatus, send } from 'h3'
import { requireDb } from '../../utils/db'
import { getInstanceUrl } from '../../utils/env'
import { buildInstanceUrl } from '../../utils/instanceRequest'

const HOP_HEADERS = new Set([
  'transfer-encoding',
  'content-encoding',
  'content-length',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'upgrade',
])

export default defineEventHandler(async (event) => {
  const db = requireDb(event)
  console.log('WEBHOOK HIT', event)

  const instanceUrl = getInstanceUrl(event)

  const pathParam = getRouterParam(event, 'path') ?? ''
  const segments = pathParam.split('/').filter(Boolean)
  if (segments.length < 2) {
    throw createError({
      statusCode: 404,
      message: 'Webhook path must be /webhook/<channel>/<identifier>/...',
    })
  }

  const channel = segments[0]
  const identifier = segments[1]

  const row = (await db
    .prepare('SELECT user_id FROM webhook_routes WHERE channel = ? AND identifier = ?')
    .bind(channel, identifier)
    .first()) as { user_id: string } | null

  if (!row) {
    throw createError({ statusCode: 404, message: 'Webhook route not found' })
  }

  const instanceId = row.user_id
  const url = getRequestURL(event)
  const target = buildInstanceUrl(instanceUrl, url.pathname + url.search, instanceId)

  const method = getMethod(event)
  const incomingHeaders = getRequestHeaders(event)
  const headers: Record<string, string> = {}
  const skipRequestHeaders = new Set(['host'])
  for (const [k, v] of Object.entries(incomingHeaders)) {
    if (v !== undefined && typeof v === 'string' && !skipRequestHeaders.has(k.toLowerCase())) headers[k] = v
  }
  const body = method !== 'GET' && method !== 'HEAD' ? await readRawBody(event, false) : undefined

  const res = await fetch(target, {
    method,
    headers,
    body: body ?? undefined,
    signal: AbortSignal.timeout(30_000),
  })

  setResponseStatus(event, res.status, res.statusText)
  res.headers.forEach((value, key) => {
    const k = key.toLowerCase()
    if (HOP_HEADERS.has(k)) return
    setHeader(event, key, value)
  })

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  return send(event, await res.text(), contentType || 'text/plain')
})
