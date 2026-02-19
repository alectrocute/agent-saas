<script setup lang="ts">
import { configOptions } from '~/utils/config-options'
import { isPlainObject } from '~/utils/config-editor'
import { getErrorMessage } from '~/utils/format'

const props = defineProps<{
  config: Record<string, unknown>
  loadConfig: () => Promise<void>
}>()
const emit = defineEmits<{ 'update:config': [v: Record<string, unknown>] }>()

const { getEmailOrThrow } = useUserEmail()
const toast = useToast()

const config = computed({
  get: () => props.config,
  set: (v) => emit('update:config', v),
})
const configLoading = ref(false)

const openrouterModels = ref<{ value: string; label: string }[]>([])

async function fetchOpenRouterModels() {
  try {
    const { models } = await $fetch<{ models: { value: string; label: string }[] }>('/api/openrouter/models', {
      method: 'POST',
      body: {},
    })
    openrouterModels.value = models
  } catch {
    openrouterModels.value = []
  }
}

onMounted(fetchOpenRouterModels)

async function saveConfig() {
  configLoading.value = true
  try {
    getEmailOrThrow()
    await $fetch('/api/me/config', { method: 'PUT', body: { config: props.config } })
    toast.add({
      title: 'Config saved',
      description: 'Stop and start your instance for changes to take effect.',
      color: 'success',
    })
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e), color: 'error' })
  } finally {
    configLoading.value = false
  }
}

async function onLoadClick() {
  configLoading.value = true
  try {
    await props.loadConfig()
  } finally {
    configLoading.value = false
  }
}

async function resetToDefaults() {
  if (!confirm('Reset all config to defaults and save? This cannot be undone.')) return
  configLoading.value = true
  try {
    getEmailOrThrow()
    const defaults = JSON.parse(JSON.stringify(configOptions)) as Record<string, unknown>
    emit('update:config', defaults)
    await $fetch('/api/me/config', { method: 'PUT', body: { config: defaults } })
    toast.add({
      title: 'Config reset to defaults',
      description: 'Stop and start your instance for changes to take effect.',
      color: 'success',
    })
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e), color: 'error' })
  } finally {
    configLoading.value = false
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

const sectionOrderForSubtabs = ['agents', 'channels', 'providers', 'tools', 'heartbeat', 'devices', 'gateway'] as const
const optionsForSubtabs = configOptions as Record<string, unknown>
const settingsSubtabs: { id: string; label: string }[] = []
const settingsSectionHidden = new Set(['gateway'])
for (const sectionKey of sectionOrderForSubtabs) {
  if (settingsSectionHidden.has(sectionKey)) continue
  const sectionVal = optionsForSubtabs[sectionKey]
  if (sectionVal == null || typeof sectionVal !== 'object' || Array.isArray(sectionVal)) continue
  const sectionObj = sectionVal as Record<string, unknown>
  const hasObjectSubs = Object.values(sectionObj).some((v) => isPlainObject(v) && !Array.isArray(v))
  if (hasObjectSubs) {
    const channelAllowlist = sectionKey === 'channels' ? ['telegram', 'discord', 'slack'] : null
    const providerHidden = sectionKey === 'providers' ? new Set(['nvidia', 'ollama', 'openrouter']) : null
    for (const [subKey, subVal] of Object.entries(sectionObj)) {
      if (channelAllowlist && !channelAllowlist.includes(subKey)) continue
      if (providerHidden?.has(subKey)) continue
      if (subVal != null && typeof subVal === 'object' && !Array.isArray(subVal))
        settingsSubtabs.push({ id: `${sectionKey}.${subKey}`, label: `${capitalize(subKey)}` })
    }
  } else {
    settingsSubtabs.push({ id: sectionKey, label: capitalize(sectionKey) })
  }
}

const activeSettingsSubtab = ref(settingsSubtabs[0]?.id ?? 'agents.defaults')
</script>

<template>
  <div class="flex justify-start gap-0">
    <nav class="flex flex-col gap-1 pr-2">
      <button v-for="sub in settingsSubtabs" :key="sub.id" type="button"
        class="flex gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition text-left"
        :class="activeSettingsSubtab === sub.id ? 'bg-amber-600/20 text-amber-300' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'"
        @click="activeSettingsSubtab = sub.id">
        {{ sub.label }}
      </button>
    </nav>

    <section class="space-y-2 w-full">
      <UAlert
        v-if="activeSettingsSubtab === 'agents.defaults'"
        color="primary"
        variant="soft"
        icon="i-heroicons-sparkles"
        title="Model: @openrouter/aurora-alpha"
        description="The model is chosen automatically for you. We strive to use the latest cutting-edge model available."
      />

      <ConfigEditor v-model="config" :active-path="activeSettingsSubtab" :openrouter-models="openrouterModels" />

      <div class="flex flex-wrap gap-2">
        <UButton size="sm" :loading="configLoading" @click="saveConfig">Save config</UButton>
        <UButton size="sm" variant="soft" :loading="configLoading" @click="resetToDefaults">Reset to defaults</UButton>
      </div>
    </section>
  </div>
</template>
