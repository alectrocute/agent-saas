<script setup lang="ts">
definePageMeta({ layout: 'blank', auth: false })
</script>

<template>
  <div>
    <div class="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center space-y-4 max-w-[400px] word-break-keep-all">
        <p class="text-zinc-300">Sign in to continue, your free beta instance will be created automatically.</p>
        <UButton tag="a" href="/login" size="md" color="primary" class="gap-2">
          <UIcon name="i-simple-icons-google" class="w-5 h-5" />
          Sign in with Google
        </UButton>
      </div>
    </div>
  </div>
</template>
