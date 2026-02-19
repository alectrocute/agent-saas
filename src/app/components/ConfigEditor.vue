<script setup lang="ts">
import { configOptions, configHiddenPaths } from '~/utils/config-options'
import { getByPath, setByPath, isPlainObject } from '~/utils/config-editor'

const props = withDefaults(
  defineProps<{
    modelValue: Record<string, unknown>
    activePath?: string | null
    openrouterModels?: { value: string; label: string }[]
  }>(),
  { activePath: null, openrouterModels: () => [] }
)

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

function get(path: string): unknown {
  return getByPath(props.modelValue, path)
}

function set(path: string, value: unknown) {
  const next = JSON.parse(JSON.stringify(props.modelValue))
  setByPath(next, path, value)
  emit('update:modelValue', next)
}

provide('configGet', get)
provide('configSet', set)
provide('openrouterModels', computed(() => props.openrouterModels ?? []))

provide('configHiddenPaths', configHiddenPaths)

const sectionOrder = ['agents', 'channels', 'providers', 'tools', 'heartbeat', 'devices', 'gateway'] as const
const options = configOptions as Record<string, unknown>

const activePathSchema = computed(() => {
  const path = props.activePath
  if (!path) return null
  const schema = getByPath(options, path)
  if (schema == null || typeof schema !== 'object' || Array.isArray(schema)) return null
  const sectionLabel = path.split('.').pop() ?? path
  return { pathPrefix: path + '.', schema: schema as Record<string, unknown>, sectionLabel }
})
</script>

<template>
  <div class="space-y-4">
    <template v-if="activePathSchema">
      <ConfigEditorSection
        :path-prefix="activePathSchema.pathPrefix"
        :schema="activePathSchema.schema"
        :section-label="activePathSchema.sectionLabel"
      />
    </template>
    <template v-else>
      <template v-for="sectionKey in sectionOrder" :key="sectionKey">
        <ConfigEditorSection
          v-if="options[sectionKey] != null && isPlainObject(options[sectionKey])"
          :path-prefix="sectionKey + '.'"
          :schema="(options[sectionKey] as Record<string, unknown>)"
          :section-label="sectionKey"
        />
      </template>
    </template>
  </div>
</template>
