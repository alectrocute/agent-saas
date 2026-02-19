<script setup lang="ts">
import { getErrorMessage } from '~/utils/format'

export type InstanceState = {
  status: string
  updated_at: string | null
  source?: string
  lastChange?: number
  exitCode?: number
  config_present?: boolean
  instanceId?: string
  running?: boolean
}

const props = defineProps<{
  instanceState: InstanceState | null
  derivedInstanceId: string | null
  loadState: () => Promise<void>
}>()

const emit = defineEmits<{ start: []; stop: [] }>()

const { getEmailOrThrow } = useUserEmail()

const toast = useToast()

const instanceLoading = ref(false)
const BUTTON_COOLDOWN_MS = 12_000
const controlDisabledUntil = ref<number | null>(null)

const instanceControlDisabled = computed(() =>
  controlDisabledUntil.value != null && Date.now() < controlDisabledUntil.value
)

const isInstanceRunning = computed(() => props.instanceState?.status === 'healthy' && props.instanceState?.running)

function applyButtonCooldown() {
  controlDisabledUntil.value = Date.now() + BUTTON_COOLDOWN_MS
  setTimeout(() => {
    controlDisabledUntil.value = null
  }, BUTTON_COOLDOWN_MS)
}

const logsTail = ref(200)
const logsLoading = ref(false)
const logsAuto = ref(true)
const logsText = ref('')
const logsOpen = ref(!!props.instanceState?.running)
let logsPollCancelled = false
onUnmounted(() => {
  logsPollCancelled = true
})

async function startInstance() {
  instanceLoading.value = true
  try {
    getEmailOrThrow()
    await $fetch('/api/instance/start', { method: 'POST' })
    toast.add({ title: 'Instance started', color: 'success' })
    await props.loadState()
    await loadLogs()
    emit('start')
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e), color: 'error' })
  } finally {
    instanceLoading.value = false
    applyButtonCooldown()
  }
}

async function stopInstance() {
  instanceLoading.value = true
  try {
    getEmailOrThrow()
    await $fetch('/api/instance/stop', { method: 'POST' })
    toast.add({ title: 'Instance stopped', color: 'success' })
    await props.loadState()
    emit('stop')
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e), color: 'error' })
  } finally {
    instanceLoading.value = false
    applyButtonCooldown()
  }
}

async function loadLogs() {
  if (!props.instanceState?.running) return
  logsLoading.value = true
  try {
    getEmailOrThrow()
    const tailNum = Math.min(Math.max(Number.parseInt(String(logsTail.value), 10) || 200, 1), 2000)
    const res = await $fetch<{
      ok: true
      instanceId: string
      tail: number
      result: {
        ok: true
        truncated: boolean
        lines: Array<{ ts: string; stream: string; line: string }>
      }
    }>('/api/instance/logs', { query: { tail: String(tailNum) } })
    logsText.value = [...res.result.lines].reverse().map((l) => `${l.ts} [${l.stream}] ${l.line}`).join('\n')
  } catch (e: unknown) {
    logsText.value = getErrorMessage(e)
  } finally {
    logsLoading.value = false
  }
}

// Poll logs only when Live is on, Logs section is open, and component is mounted
watch(
  () => [logsAuto.value, logsOpen.value] as const,
  ([auto, open]) => {
    if (!auto || !open) return
      ; (async () => {
        while (logsAuto.value && logsOpen.value && !logsPollCancelled) {
          if (props.instanceState?.running) await loadLogs()
          await new Promise((r) => setTimeout(r, 1500))
        }
      })()
  },
  { immediate: true }
)

watch(
  () => props.instanceState?.running === true,
  (running) => {
    if (running) loadLogs()
  }
)

watch(
  () => props.instanceState?.running,
  (running) => {
    logsOpen.value = Boolean(running)
  },
  { immediate: true }
)

function toggleLogs() {
  if (props.instanceState?.running) logsOpen.value = !logsOpen.value
}
</script>

<template>
  <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4 flex flex-col flex-1 min-h-0">
    <div class="flex items-center gap-2 shrink-0">
      <div class="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center shrink-0">
        <UIcon name="i-heroicons-cube" class="w-5 h-5 text-amber-400" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="font-medium text-zinc-200">My Agent</div>
        <div class="text-xs text-zinc-500 font-mono truncate">{{ derivedInstanceId ?? '—' }}</div>
      </div>
    </div>
    <div class="text-sm text-zinc-400 shrink-0">
      <span>Status:
        <template v-if="isInstanceRunning">Running</template>
        <template v-else>Stopped</template>
      </span>
    </div>
    <div class="flex items-center gap-2 flex-wrap shrink-0">
      <UButton v-if="!isInstanceRunning" size="sm" :loading="instanceLoading" :disabled="instanceControlDisabled"
        class="gap-1.5" @click="startInstance">
        <UIcon v-if="!instanceLoading" name="i-heroicons-play" class="w-4 h-4" />
        Start
      </UButton>
      <UButton v-if="isInstanceRunning" size="sm" color="neutral" variant="soft" :loading="instanceLoading"
        :disabled="instanceControlDisabled" class="gap-1.5" @click="stopInstance">
        <UIcon v-if="!instanceLoading" name="i-heroicons-stop" class="w-4 h-4" />
        Stop
      </UButton>
    </div>

    <details
      class="pt-2 flex flex-col min-h-0 relative h-full border-t border-b border-zinc-700 group overflow-y-scroll"
      :open="logsOpen">
      <summary
        class="flex items-center gap-2 list-none text-sm font-medium transition shrink-0 [&::-webkit-details-marker]:hidden"
        :class="isInstanceRunning
          ? 'cursor-pointer text-zinc-400 hover:text-zinc-300'
          : 'cursor-not-allowed text-zinc-500 opacity-60'" @click.prevent="toggleLogs">
        <UIcon name="i-heroicons-chevron-right-20-solid" class="w-4 h-4 transition group-open:rotate-90" />
        Logs
      </summary>

      <div class="my-3 space-y-2 flex flex-col min-h-0 overflow-hidden relative">
        <div class="flex items-center gap-2 flex-wrap shrink-0">
          <UButton size="sm" variant="soft" @click="loadLogs">Refresh</UButton>
          <label class="flex items-center gap-2 text-sm text-zinc-300 select-none">
            <input v-model="logsAuto" type="checkbox" class="accent-amber-500" />
            Live
          </label>
        </div>
      </div>

      <div class="h-full grow-1 flex w-full px-2">
        <pre v-text="logsText" class="whitespace-pre-wrap w-full h-auto font-mono text-xs" />
      </div>

    </details>
  </div>
</template>
