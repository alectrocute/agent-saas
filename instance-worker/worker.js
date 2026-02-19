import { InstanceContainer } from './lib/container.js'

export { InstanceContainer }

export default {
  async fetch(request, env) {
    const instanceId = new URL(request.url).searchParams.get('instanceId');

    if (!instanceId) {
      return new Response('Instance ID is required', { status: 400 })
    }

    const id = env.INSTANCE_CONTAINER.idFromName(instanceId)
    const container = env.INSTANCE_CONTAINER.get(id)

    return container.fetch(request)
  },
}
