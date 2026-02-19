<script setup lang="ts">
import { getErrorMessage } from '~/utils/format'

export type InstanceState = {
  running?: boolean
  [k: string]: unknown
}

const props = defineProps<{
  instanceState: InstanceState | null
  active: boolean
}>()

const { getEmailOrThrow } = useUserEmail()
const toast = useToast()

const workspaceFiles = ref<string[]>([])
const workspaceLoading = ref(false)
const workspaceSaveLoading = ref(false)
const workspaceSelectedPath = ref<string | null>(null)
const workspaceContent = ref('')
const workspaceNewName = ref('')

async function loadWorkspaceFiles() {
  if (!props.instanceState?.running) return
  workspaceLoading.value = true
  try {
    getEmailOrThrow()
    const res = await $fetch<{ ok: boolean; files: string[] }>('/api/workspace/files')
    workspaceFiles.value = res.files ?? []
  } catch (e: unknown) {
    workspaceFiles.value = []
    toast.add({ title: getErrorMessage(e), color: 'error' })
  } finally {
    workspaceLoading.value = false
  }
}

async function loadWorkspaceFile(path: string) {
  if (!props.instanceState?.running) return
  workspaceSelectedPath.value = path
  workspaceLoading.value = true
  try {
    getEmailOrThrow()
    const res = await $fetch<{ content: string }>('/api/workspace/file', { query: { path } })
    workspaceContent.value = res?.content ?? ''
  } catch (e: unknown) {
    workspaceContent.value = ''
    toast.add({ title: getErrorMessage(e), color: 'error' })
  } finally {
    workspaceLoading.value = false
  }
}

async function saveWorkspaceFile() {
  if (!props.instanceState?.running) return
  const path = workspaceSelectedPath.value
  if (!path) {
    toast.add({ title: 'Select a file to save', color: 'error' })
    return
  }
  workspaceSaveLoading.value = true
  try {
    getEmailOrThrow()
    await $fetch('/api/workspace/file', { method: 'PUT', body: { path, content: workspaceContent.value } })
    toast.add({ title: 'File saved', color: 'success' })
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e), color: 'error' })
  } finally {
    workspaceSaveLoading.value = false
  }
}

async function createWorkspaceFile() {
  if (!props.instanceState?.running) return
  const name = workspaceNewName.value.trim() || 'untitled.md'
  const path = name.endsWith('.md') ? name : `${name}.md`
  workspaceNewName.value = ''
  workspaceSaveLoading.value = true
  try {
    getEmailOrThrow()
    await $fetch('/api/workspace/file', { method: 'PUT', body: { path, content: '' } })
    toast.add({ title: `Created ${path}`, color: 'success' })
    await loadWorkspaceFiles()
    await loadWorkspaceFile(path)
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e), color: 'error' })
  } finally {
    workspaceSaveLoading.value = false
  }
}

async function deleteWorkspaceFile(path: string) {
  if (!props.instanceState?.running) return
  if (!confirm(`Delete ${path}?`)) return
  try {
    getEmailOrThrow()
    await $fetch('/api/workspace/file', { method: 'DELETE', query: { path } })
    toast.add({ title: `Deleted ${path}`, color: 'success' })
    if (workspaceSelectedPath.value === path) {
      workspaceSelectedPath.value = null
      workspaceContent.value = ''
    }
    await loadWorkspaceFiles()
  } catch (e: unknown) {
    toast.add({ title: getErrorMessage(e), color: 'error' })
  }
}

watch(
  () => props.active && props.instanceState?.running === true,
  (shouldLoad) => {
    if (shouldLoad) loadWorkspaceFiles()
  },
  { immediate: true }
)

defineEmits<{
  (e: 'go-to-overview'): void
}>()
</script>

<template>
  <section class="flex flex-col flex-1 min-h-0 min-h-[calc(100vh-250px)] rounded-xl border border-zinc-700 bg-zinc-900/50 overflow-hidden p-4">
    <div v-if="!instanceState?.running" class="flex-1 flex items-center justify-center">
      <InstanceOfflinePrompt message="to view and edit workspace files." @start="$emit('go-to-overview')" />
    </div>
    <template v-else>
      <h2 class="text-lg font-medium mb-2">Markdown files</h2>
      <div class="flex flex-wrap items-end gap-2 mb-3">
        <UButton size="sm" variant="soft" :loading="workspaceLoading" @click="loadWorkspaceFiles">Refresh list</UButton>
        <UInput v-model="workspaceNewName" placeholder="New file name (e.g. note.md)" size="sm" class="w-56" @keydown.enter="createWorkspaceFile" />
        <UButton size="sm" :loading="workspaceSaveLoading" @click="createWorkspaceFile">New file</UButton>
      </div>
      <div class="flex gap-4 flex-1 min-h-full pb-18">
        <div class="min-w-48 max-w-[200px] rounded-lg border border-zinc-800 bg-zinc-950 p-2 overflow-y-auto shrink-0">
          <p v-if="!workspaceFiles.length" class="text-sm text-zinc-500 py-2">No .md files</p>
          <button
            v-for="f in workspaceFiles"
            :key="f"
            type="button"
            class="block w-full text-left px-2 py-1.5 rounded text-sm font-mono truncate"
            :class="workspaceSelectedPath === f ? 'bg-amber-600/30 text-amber-200' : 'text-zinc-300 hover:bg-zinc-800'"
            @click="loadWorkspaceFile(f)"
          >
            {{ f }}
          </button>
        </div>
        <div class="flex-1 min-w-0 flex flex-col space-y-2">
          <div v-if="workspaceSelectedPath" class="flex items-center gap-2 flex-wrap shrink-0">
            <span class="text-sm text-zinc-400 font-mono">{{ workspaceSelectedPath }}</span>
            <UButton size="xs" color="error" variant="soft" @click="deleteWorkspaceFile(workspaceSelectedPath)">Delete</UButton>
          </div>
          <textarea
            v-model="workspaceContent"
            class="flex-1 min-h-[200px] w-full font-mono text-sm rounded-lg bg-zinc-900 border border-zinc-700 p-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Select a file or create one"
            spellcheck="false"
          />
          <UButton size="sm" class="w-fit" :loading="workspaceSaveLoading" :disabled="!workspaceSelectedPath" @click="saveWorkspaceFile">Save</UButton>
        </div>
      </div>
    </template>
  </section>
</template>
