<script setup lang="ts">
import { getErrorMessage } from '~/utils/format'

export type InstanceState = {
  running?: boolean
  [k: string]: unknown
}

const props = defineProps<{
  instanceState: InstanceState | null
}>()

const { getEmailOrThrow } = useUserEmail()

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  at: string
  error?: boolean
}
const chatMessages = ref<ChatMessage[]>([])
const chatInput = ref('')
const chatLoading = ref(false)
const chatEnd = ref<HTMLElement | null>(null)

function chatScrollToEnd() {
  nextTick(() => chatEnd.value?.scrollIntoView({ behavior: 'smooth' }))
}

function agentResponseOnly(full: string): { short: string; hasMore: boolean } {
  if (!full.trim()) return { short: '', hasMore: false }
  const lines = full.split('\n').map((l) => l.trim()).filter(Boolean)
  const withLobster = lines.find((l) => l.startsWith('🦞'))
  if (withLobster) {
    const short = withLobster.replace(/^🦞\s*/, '').trim() || withLobster
    return { short, hasMore: lines.length > 1 }
  }
  const responseLine = lines.filter((l) => l.includes('Response:')).pop()
  if (responseLine) {
    const match = responseLine.match(/Response:\s*(.+)/)
    const short = (match?.[1] ?? responseLine).trim()
    return { short, hasMore: lines.length > 1 }
  }
  const last = lines[lines.length - 1]
  return { short: last ?? full, hasMore: lines.length > 1 }
}

async function sendChat() {
  const text = chatInput.value.trim()
  if (!text || chatLoading.value || !props.instanceState?.running) return

  chatMessages.value.push({
    id: crypto.randomUUID(),
    role: 'user',
    content: text,
    at: new Date().toISOString(),
  })
  chatInput.value = ''
  chatLoading.value = true
  chatScrollToEnd()

  const assistantId = crypto.randomUUID()
  chatMessages.value.push({
    id: assistantId,
    role: 'assistant',
    content: '',
    at: new Date().toISOString(),
  })
  chatScrollToEnd()

  try {
    getEmailOrThrow()
    const res = await $fetch<{ ok: boolean; output?: string; error?: string }>('/api/nanobot/agent', {
      method: 'POST',
      body: { message: text },
    })
    const idx = chatMessages.value.findIndex((m) => m.id === assistantId)
    const prev = idx !== -1 ? chatMessages.value[idx]! : null
    if (prev) {
      chatMessages.value[idx] = {
        ...prev,
        content: res.ok ? (res.output ?? '') : (res.error ?? 'Agent failed'),
        error: !res.ok,
      }
    }
  } catch (e: unknown) {
    const idx = chatMessages.value.findIndex((m) => m.id === assistantId)
    const prev = idx !== -1 ? chatMessages.value[idx]! : null
    if (prev) {
      chatMessages.value[idx] = { ...prev, content: getErrorMessage(e), error: true }
    }
  } finally {
    chatLoading.value = false
    chatScrollToEnd()
  }
}

defineEmits<{
  (e: 'go-to-overview'): void
}>()
</script>

<template>
  <section class="flex flex-col flex-1 min-h-0 min-h-[calc(100vh-250px)] rounded-xl border border-zinc-700 bg-zinc-900/50 overflow-hidden">
    <div v-if="!instanceState?.running" class="flex-1 flex items-center justify-center p-6">
      <InstanceOfflinePrompt message="to chat with your agent." @start="$emit('go-to-overview')" />
    </div>
    <template v-else>
      <div class="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        <div v-if="!chatMessages.length" class="flex flex-col items-center justify-center py-16 text-zinc-500 text-sm">
          <UIcon name="i-heroicons-chat-bubble-left-right" class="w-12 h-12 mb-3 opacity-50" />
          <p>No messages yet. Send a message to start.</p>
        </div>
        <div v-for="msg in chatMessages" :key="msg.id" class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
          <div class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words" :class="msg.role === 'user'
            ? 'bg-amber-600/90 text-zinc-100'
            : msg.error
              ? 'bg-red-950/80 text-red-200 border border-red-800/50'
              : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
          ">
            <template v-if="msg.role === 'user'">{{ msg.content }}</template>
            <template v-else>
              <pre class="m-0 font-sans text-inherit text-wrap">{{ (msg.content && agentResponseOnly(msg.content).short) || (chatLoading ? '…' : '') }}</pre>
              <details v-if="msg.content && agentResponseOnly(msg.content).hasMore" class="group mt-2 pt-2 border-t border-zinc-600">
                <summary class="cursor-pointer list-none text-xs text-zinc-500 hover:text-zinc-400 [&::-webkit-details-marker]:hidden">Show full output</summary>
                <pre class="mt-2 whitespace-pre-wrap font-mono text-xs text-zinc-400 overflow-x-auto">{{ msg.content }}</pre>
              </details>
            </template>
          </div>
        </div>
        <div ref="chatEnd" />
      </div>
      <div class="shrink-0 border-t border-zinc-700 p-4">
        <form class="flex gap-2" @submit.prevent="sendChat">
          <textarea v-model="chatInput"
            class="flex-1 min-h-[44px] max-h-32 resize-y rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="Type a message…" rows="1" spellcheck="false" :disabled="chatLoading"
            @keydown.enter.exact.prevent="sendChat" @keydown.meta.enter="sendChat" />
          <UButton type="submit" size="md" color="primary" :loading="chatLoading"
            :disabled="!chatInput.trim() || !instanceState?.running" class="shrink-0 self-end">
            Send
          </UButton>
        </form>
      </div>
    </template>
  </section>
</template>
