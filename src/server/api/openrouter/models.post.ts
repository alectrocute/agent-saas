export default defineEventHandler(async (event) => {
  const body = await readBody<{ apiKey?: string }>(event).catch(() => ({}))
  const apiKey =
    (process.env.OPENROUTER_API_KEY?.trim()) ||
    (body?.apiKey && typeof body.apiKey === 'string' ? body.apiKey.trim() : '')
  if (!apiKey) {
    throw createError({
      statusCode: 400,
      message: 'OPENROUTER_API_KEY env var not set',
    })
  }
  const res = await $fetch<{ data: Array<{ id: string; name?: string }> }>(
    'https://openrouter.ai/api/v1/models',
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  )
  const models = (res.data ?? []).map((m) => ({
    value: m.id,
    label: m.name ?? m.id,
  }))
  return { models }
})
