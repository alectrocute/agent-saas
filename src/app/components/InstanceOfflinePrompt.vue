<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Optional suffix, e.g. "to view and edit workspace files." Default: "to use this feature." */
    message?: string
  }>(),
  { message: 'to use this feature.' }
)

defineEmits<{
  (e: 'start'): void
}>()
</script>

<template>
  <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-zinc-400">
    <p class="mb-3">Start your instance on the Overview page {{ message }}</p>
    <UButton size="sm" @click="$emit('start')">Go to Overview</UButton>
  </div>
</template>
