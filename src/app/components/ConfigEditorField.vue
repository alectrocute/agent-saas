<script setup lang="ts">
const props = defineProps<{
  path: string
  schemaValue: unknown
  modelValue: unknown
  selectOptions?: { value: string; label: string }[]
}>()
const emit = defineEmits<{
  update: [value: unknown]
}>()

function update(v: unknown) {
  emit('update', v)
}

const isString = computed(() => typeof props.schemaValue === 'string')
const isNumber = computed(() => typeof props.schemaValue === 'number')
const useSelect = computed(() => isString.value && props.selectOptions && props.selectOptions.length > 0)
const currentValue = computed(() => (props.modelValue as string) ?? (props.schemaValue as string) ?? '')
const optionSet = computed(() => new Set((props.selectOptions ?? []).map((o) => o.value)))
const hasCurrentInOptions = computed(() => !currentValue.value || optionSet.value.has(currentValue.value))
const isBoolean = computed(() => typeof props.schemaValue === 'boolean')
const isStringArray = computed(() => Array.isArray(props.schemaValue) && (props.schemaValue.length === 0 || typeof (props.schemaValue as unknown[])[0] === 'string'))

const currentArr = computed({
  get: () => (Array.isArray(props.modelValue) ? [...(props.modelValue as string[])] : []),
  set: (v: string[]) => update(v),
})
</script>

<template>
  <div class="space-y-1">
    <label v-if="isString || isNumber || useSelect" class="block text-xs text-zinc-500 font-mono truncate">{{ path.split('.').pop() }}</label>
    <select
      v-if="useSelect"
      :value="currentValue"
      class="w-full rounded-md border border-zinc-600 bg-zinc-800 px-2.5 py-1.5 text-sm font-mono text-zinc-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
      @change="update(($event.target as HTMLSelectElement).value)"
    >
      <option value="">—</option>
      <option v-if="currentValue && !hasCurrentInOptions" :value="currentValue">{{ currentValue }}</option>
      <option v-for="opt in selectOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <UInput
      v-else-if="isString"
      :model-value="(modelValue as string) ?? (schemaValue as string)"
      class="font-mono text-sm"
      @update:model-value="update"
    />
    <UInput
      v-else-if="isNumber"
      type="number"
      :model-value="(modelValue as number) ?? (schemaValue as number)"
      class="font-mono text-sm"
      @update:model-value="update(Number(($event as string) || 0))"
    />
    <label v-else-if="isBoolean" class="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        :checked="(modelValue as boolean) ?? (schemaValue as boolean)"
        class="rounded border-zinc-600 bg-zinc-800 accent-amber-500"
        @change="update(($event.target as HTMLInputElement).checked)"
      />
      <span class="text-zinc-400 font-mono text-xs">{{ path.split('.').pop() }}</span>
    </label>
    <div v-else-if="isStringArray" class="space-y-1">
      <div class="text-xs text-zinc-500 font-mono">{{ path.split('.').pop() }}</div>
      <div class="flex flex-wrap gap-1">
        <UInput
          v-for="(item, i) in currentArr"
          :key="i"
          :model-value="item"
          size="xs"
          class="font-mono w-40"
          @update:model-value="(v) => { const a = [...currentArr]; a[i] = v as string; update(a) }"
        />
        <UButton size="xs" variant="soft" color="neutral" @click="update([...currentArr, ''])">+</UButton>
        <UButton v-if="currentArr.length" size="xs" variant="ghost" color="error" @click="update(currentArr.slice(0, -1))">−</UButton>
      </div>
    </div>
  </div>
</template>
