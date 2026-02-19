<script setup lang="ts">
defineProps<{
  running: boolean
  loading: boolean
}>()
defineEmits<{
  refresh: []
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <span v-if="!loading" class="text-sm" :class="running ? 'text-emerald-400' : 'text-zinc-500'">
      {{ running ? 'Instance running' : 'Instance stopped' }}
    </span>
    <UButton size="sm" variant="soft" :loading="loading" @click="$emit('refresh')">
      Refresh
    </UButton>
    <UButton size="sm" tag="NuxtLink" to="/manage">
      Manage instance
    </UButton>
  </div>
</template>
