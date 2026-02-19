<script setup lang="ts">
  defineProps<{
    title?: string
    running: boolean
    loading: boolean
  }>()
</script>

<template>
  <div
    class="flex items-center justify-between gap-4 flex-wrap"
  >
    <div class="flex items-center gap-4">
      <h1 v-if="title" class="text-2xl font-semibold">
        {{ title }}
      </h1>
      
      <slot name="title-extra" />
    </div>

    <InstanceStatusBar
      :running="running"
      :loading="loading"
      @refresh="$emit('refresh')"
    />
  </div>
</template>
