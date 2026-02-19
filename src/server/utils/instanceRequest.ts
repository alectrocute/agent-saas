import type { H3Event } from 'h3'
import { createError, setHeader, setResponseStatus } from 'h3'

export function buildInstanceUrl(baseUrl: string, path: string, instanceId: string): string {
  const target = new URL(path, baseUrl)
  target.searchParams.set('instanceId', instanceId)
  return target.toString()
}

export async function throwIfNotOk(
  res: Response,
  messagePrefix: string,
  opts?: { use4xxStatus?: boolean }
): Promise<void> {
  if (res.ok) return
  const text = await res.text().catch(() => '')
  const statusCode = opts?.use4xxStatus && res.status >= 400 && res.status < 500 ? res.status : 502
  throw createError({
    statusCode,
    message: text || res.statusText || `${messagePrefix} (${res.status})`,
  })
}

export async function fetchInstanceOk(
  baseUrl: string,
  path: string,
  instanceId: string,
  init: RequestInit & { messagePrefix?: string } = {}
): Promise<Response> {
  const { messagePrefix = 'Instance request failed', ...fetchInit } = init
  const url = buildInstanceUrl(baseUrl, path, instanceId)
  const res = await fetch(url, fetchInit)
  await throwIfNotOk(res, messagePrefix)
  return res
}

const HOP_HEADERS = new Set([
  'transfer-encoding',
  'content-encoding',
  'content-length',
  'connection',
])

/** Fetch instance path and forward status, headers, and body to the response. */
export async function proxyResponseToInstance(
  event: H3Event,
  instanceUrl: string,
  path: string,
  instanceId: string,
  init: RequestInit = {}
): Promise<unknown> {
  const url = buildInstanceUrl(instanceUrl, path, instanceId)
  const res = await fetch(url, init)
  setResponseStatus(event, res.status, res.statusText)
  for (const [key, value] of res.headers) {
    const k = key.toLowerCase()
    if (HOP_HEADERS.has(k)) continue
    setHeader(event, key, value)
  }
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) return (await res.json()) as unknown
  return await res.text()
}
