<script setup lang="ts">
import { getErrorMessage } from '~/utils/format'

definePageMeta({ auth: true, authMessage: 'Sign in to access admin.', title: 'Admin' })
const { effectiveEmail } = useUserEmail()
const { instanceRunning, instanceLoading, loadInstanceState } = useInstanceState()

onMounted(loadInstanceState)

type InstanceRow = {
  instance_id: string
  email: string | null
  updated_at: string
  state?: { running?: boolean; status?: string; lastChange?: number }
}

const instances = ref<InstanceRow[]>([])
const loading = ref(true)
const stoppingId = ref<string | null>(null)
const toast = useToast()
const now = ref(Date.now())

function formatRunningSince(lastChangeMs: number): string {
  const elapsed = Math.max(0, Math.floor((now.value - lastChangeMs) / 1000))
  if (elapsed < 60) return `${elapsed}s`
  const m = Math.floor(elapsed / 60)
  const s = elapsed % 60
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem ? `${h}h ${rem}m` : `${h}h`
}

let tickInterval: ReturnType<typeof setInterval> | null = null
watch(instances, (list) => {
  const hasRunning = list.some((r) => r.state?.running)
  if (hasRunning && !tickInterval) {
    tickInterval = setInterval(() => { now.value = Date.now() }, 1000)
  } else if (!hasRunning && tickInterval) {
    clearInterval(tickInterval)
    tickInterval = null
  }
}, { immediate: true })
onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

async function fetchInstances() {
  if (!effectiveEmail.value?.trim()) return
  loading.value = true
  try {
    const res = await $fetch<{ instances: InstanceRow[] }>('/api/admin/instances')
    instances.value = res.instances
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Failed to load'), color: 'error' })
    instances.value = []
  } finally {
    loading.value = false
  }
}

async function stopInstance(instanceId: string) {
  stoppingId.value = instanceId
  try {
    await $fetch(`/api/admin/instances/${encodeURIComponent(instanceId)}/stop`, { method: 'POST' })
    toast.add({ title: 'Instance stopped', color: 'success' })
    await fetchInstances()
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e, 'Stop failed'), color: 'error' })
  } finally {
    stoppingId.value = null
  }
}

watch(effectiveEmail, (email) => {
  if (email) fetchInstances()
}, { immediate: true })

onMounted(() => {
  if (effectiveEmail.value) fetchInstances()
})
</script>

<template>
  <PageLayout>
      <section class="space-y-2">
        <div class="flex items-center gap-2">
          <UButton size="sm" variant="soft" :loading="loading" @click="fetchInstances">Refresh</UButton>
        </div>
        <div class="rounded-lg border border-zinc-800 overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-zinc-900 text-zinc-400 text-left">
              <tr>
                <th class="px-4 py-2 font-medium">Instance ID</th>
                <th class="px-4 py-2 font-medium">Email</th>
                <th class="px-4 py-2 font-medium">Updated</th>
                <th class="px-4 py-2 font-medium">Status</th>
                <th class="px-4 py-2 font-medium">Running</th>
                <th class="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-800">
              <tr v-if="loading && !instances.length" class="bg-zinc-900/50">
                <td colspan="6" class="px-4 py-6 text-center text-zinc-500">Loading…</td>
              </tr>
              <tr v-else-if="!instances.length" class="bg-zinc-900/50">
                <td colspan="6" class="px-4 py-6 text-center text-zinc-500">No instances</td>
              </tr>
              <tr
                v-for="row in instances"
                :key="row.instance_id"
                class="hover:bg-zinc-900/50"
              >
                <td class="px-4 py-2 font-mono text-zinc-300">{{ row.instance_id }}</td>
                <td class="px-4 py-2 text-zinc-300">{{ row.email ?? '—' }}</td>
                <td class="px-4 py-2 text-zinc-500">{{ row.updated_at }}</td>
                <td class="px-4 py-2">
                  <span v-if="row.state?.running" class="text-emerald-400">running</span>
                  <span v-else-if="row.state && !row.state.running" class="text-zinc-500">stopped</span>
                  <span v-else class="text-zinc-600">—</span>
                </td>
                <td class="px-4 py-2 text-zinc-400">
                  <template v-if="row.state?.running && row.state?.lastChange != null">
                    {{ formatRunningSince(row.state.lastChange) }}
                  </template>
                  <span v-else>—</span>
                </td>
                <td class="px-4 py-2">
                  <UButton
                    v-if="row.state?.running"
                    size="xs"
                    color="neutral"
                    variant="soft"
                    :loading="stoppingId === row.instance_id"
                    @click="stopInstance(row.instance_id)"
                  >
                    Stop
                  </UButton>
                  <span v-else class="text-zinc-600">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
  </PageLayout>
</template>
