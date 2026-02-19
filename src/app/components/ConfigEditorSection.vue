<script setup lang="ts">
import { isPlainObject } from '~/utils/config-editor'

const props = defineProps<{
  pathPrefix: string
  schema: Record<string, unknown>
  sectionLabel: string
}>()

const get = inject<(path: string) => unknown>('configGet')!
const set = inject<(path: string, value: unknown) => void>('configSet')!

const hiddenPaths = inject<Set<string>>('configHiddenPaths')!
const openrouterModels = inject<ComputedRef<{ value: string; label: string }[]>>('openrouterModels')!

const entries = computed(() =>
  Object.entries(props.schema).filter(([key]) => !hiddenPaths.has(props.pathPrefix + key))
)
</script>

<template>
  <div class="rounded-lg border border-zinc-800 bg-zinc-900/30 overflow-hidden">
    <div class="px-3 py-2 bg-zinc-800/50 text-sm font-medium text-zinc-300 capitalize border-b border-zinc-800">
      {{ sectionLabel }}
    </div>
    <div class="p-3 space-y-3">
      <template v-for="[key, schemaVal] in entries" :key="key">
        <template v-if="isPlainObject(schemaVal) && !Array.isArray(schemaVal)">
          <ConfigEditorSection
            :path-prefix="pathPrefix + key + '.'"
            :schema="(schemaVal as Record<string, unknown>)"
            :section-label="key"
          />
        </template>
        <ConfigEditorField
          v-else
          :path="pathPrefix + key"
          :schema-value="schemaVal"
          :model-value="get(pathPrefix + key)"
          :select-options="pathPrefix + key === 'agents.defaults.model' && openrouterModels?.length > 0 ? openrouterModels : undefined"
          @update="(v) => set(pathPrefix + key, v)"
        />
      </template>
    </div>
  </div>
</template>
