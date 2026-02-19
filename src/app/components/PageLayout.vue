<script setup lang="ts">
defineProps<{ fillHeight?: boolean }>()
</script>

<template>
  <div class="mx-auto w-full space-y-6 max-w-5xl" :class="fillHeight ? 'flex flex-col flex-1 min-h-0' : 'h-full overflow-y-scroll px-2'">
    <slot />
  </div>
</template>
