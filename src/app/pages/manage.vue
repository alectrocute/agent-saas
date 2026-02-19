<script setup lang="ts">
import { configOptions } from '~/utils/config-options'
import { deepMerge } from '~/utils/config-editor'
import { getErrorMessage } from '~/utils/format'
import type { InstanceState } from '~/components/ManageOverview.vue'

definePageMeta({ auth: true, authMessage: 'Sign in to manage config, logs, and probes.', title: 'Manage' })
const { effectiveEmail, getEmailOrThrow, isEmailValid } = useUserEmail()

const derivedInstanceId = ref<string | null>(null)
const instanceState = ref<InstanceState | null>(null)
const config = ref<Record<string, unknown>>(JSON.parse(JSON.stringify(configOptions)))

async function refreshDerivedInstanceId() {
  const email = effectiveEmail.value.trim()
  if (!email || !isEmailValid(email)) {
    derivedInstanceId.value = null
    return
  }
  try {
    const res = await $fetch<{ instanceId: string }>('/api/me/instance-id')
    derivedInstanceId.value = res.instanceId
  } catch {
    derivedInstanceId.value = null
  }
}

async function loadState() {
  try {
    getEmailOrThrow()
    instanceState.value = await $fetch<InstanceState>('/api/instance/state')
  } catch {
    instanceState.value = null
  }
}

const toast = useToast()

async function loadConfig() {
  try {
    getEmailOrThrow()
    const res = await $fetch<{ config: object | null }>('/api/me/config')
    const base = JSON.parse(JSON.stringify(configOptions))
    config.value = deepMerge(base, res.config ?? {}) as Record<string, unknown>
  } catch (e: unknown) {
    // toast.add({ title: getErrorMessage(e), color: 'error' })
  }
}

async function refreshManage() {
  if (!effectiveEmail.value) return
  // Instance-id and config always; state only when Overview is visible (avoids duplicate with tab watch)
  await Promise.all([refreshDerivedInstanceId(), loadConfig()])
  if (activeTab.value === 'overview') await loadState()
}

watch(effectiveEmail, (email) => {
  if (email) refreshManage()
}, { immediate: true })

type ManageTab = 'overview' | 'settings' | 'chat' | 'workspace'
const route = useRoute()
const activeTab = ref<ManageTab>(
  ['chat', 'workspace', 'overview', 'settings'].includes(route.query.tab as string) ? (route.query.tab as ManageTab) : 'overview'
)
const tabs: { id: ManageTab; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'i-heroicons-squares-2x2' },
  { id: 'settings', label: 'Settings', icon: 'i-heroicons-cog-6-tooth' },
  { id: 'workspace', label: 'Workspace', icon: 'i-heroicons-folder-open' },
  { id: 'chat', label: 'Chat', icon: 'i-heroicons-chat-bubble-left-right' },
]

const STATE_POLL_MS = 6_000
let statePollInterval: ReturnType<typeof setInterval> | null = null

function startStatePolling() {
  if (statePollInterval) return
  statePollInterval = setInterval(loadState, STATE_POLL_MS)
}

function stopStatePolling() {
  if (statePollInterval) {
    clearInterval(statePollInterval)
    statePollInterval = null
  }
}

// Only poll instance state when Overview tab is visible; load state when switching to Overview (skip on initial run to avoid duplicate with refreshManage)
watch(activeTab, (tab, prevTab) => {
  if (tab === 'overview') {
    if (prevTab !== undefined) loadState()
    startStatePolling()
  } else {
    stopStatePolling()
  }
})

onUnmounted(() => {
  stopStatePolling()
})

onMounted(() => {
  startStatePolling()
})

watch(() => route.query.tab, (tab) => {
  if (tab === 'chat' || tab === 'overview' || tab === 'settings' || tab === 'workspace') activeTab.value = tab as ManageTab
})

function onOverviewStop() {
  // force the state to be updated since it takes awhile to update
  instanceState.value!.running = false
  instanceState.value!.status = 'stopped'
}
</script>

<template>
  <PageLayout fill-height>
    <div class="flex flex-col gap-0 shrink-0">
      <nav class="flex flex-wrap gap-1 border-b border-zinc-700">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          class="flex items-center gap-2 px-3 py-2.5 rounded-t-lg text-sm font-medium transition -mb-px"
          :class="activeTab === t.id ? 'bg-amber-600/20 text-amber-300 border-b-2 border-amber-500' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-b-2 border-transparent'"
          @click="activeTab = t.id"
        >
          <UIcon :name="t.icon" class="w-4 h-4 shrink-0" />
          {{ t.label }}
        </button>
      </nav>
    </div>
    <main class="min-w-0 flex flex-col flex-1 min-h-0 space-y-2">
      <ManageOverview
        v-if="activeTab === 'overview'"
        :instance-state="instanceState"
        :derived-instance-id="derivedInstanceId"
        :load-state="loadState"
        @stop="onOverviewStop"
      />
      <ManageSettings
        v-else-if="activeTab === 'settings'"
        v-model:config="config"
        :load-config="loadConfig"
      />
      <ManageChat
        v-else-if="activeTab === 'chat'"
        :instance-state="instanceState"
        @go-to-overview="activeTab = 'overview'"
      />
      <ManageWorkspace
        v-else-if="activeTab === 'workspace'"
        :instance-state="instanceState"
        :active="activeTab === 'workspace'"
        @go-to-overview="activeTab = 'overview'"
      />
    </main>
  </PageLayout>
</template>
