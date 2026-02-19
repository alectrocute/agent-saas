<script setup lang="ts">
definePageMeta({ auth: true, title: 'Dashboard' })

const { getEmailOrThrow } = useUserEmail()

const instanceId = ref<string | null>(null)
const loading = ref(true)

async function loadInstance() {
  loading.value = true
  try {
    getEmailOrThrow()
    const res = await $fetch<{ instanceId: string }>('/api/me/instance-id')
    instanceId.value = res.instanceId
  } catch {
    instanceId.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadInstance)
</script>

<template>
  <PageLayout>
    <div class="space-y-4 w-full lg:w-1/2">
      <h1 class="text-2xl font-semibold">Welcome to <code>agents.alec.is</code>!</h1>
      <p class="text-zinc-400 wrap-pretty">This is an experimental project to create a self-hosted, multi-tenant agent
        platform running entirely in Cloudflare Containers/Sandbox.</p>
      <p class="text-zinc-400">Select an instance to manage config, workspace, and chat.</p>
    </div>

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="rounded-xl border border-zinc-800 bg-zinc-900/50 h-32 animate-pulse" />
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink v-if="instanceId" to="/manage"
        class="block rounded-xl border border-zinc-700 bg-zinc-900/50 p-5 hover:border-amber-500/50 hover:bg-zinc-800/50 transition text-left group">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center group-hover:bg-amber-600/30 transition">
            <UIcon name="i-heroicons-cube" class="w-5 h-5 text-amber-400" />
          </div>
          <div class="min-w-0">
            <div class="font-medium text-zinc-200">My Agent</div>
            <div class="text-xs text-zinc-500 font-mono truncate">{{ instanceId }}</div>
          </div>
          <UIcon name="i-heroicons-chevron-right-20-solid"
            class="w-5 h-5 text-zinc-500 ml-auto shrink-0 group-hover:text-amber-400 transition" />
        </div>
      </NuxtLink>
      <p v-else class="text-sm text-zinc-500 col-span-full">No instance found.</p>
    </div>
  </PageLayout>
</template>
