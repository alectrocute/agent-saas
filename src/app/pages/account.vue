<script setup lang="ts">
definePageMeta({ auth: true, title: 'Account' })
const { user } = useUserSession()
const { instanceRunning, instanceLoading, loadInstanceState } = useInstanceState()

const billing = ref<{
  totalBillableDays: number
  totalBillableSeconds: number
  totalAmount: number
  ratePerDay: number
} | null>(null)

onMounted(() => {
  loadInstanceState()
  $fetch<{ totalBillableDays: number; totalBillableSeconds: number; totalAmount: number; ratePerDay: number }>('/api/me/billing')
    .then((data) => { billing.value = data })
    .catch(() => {})
})
</script>

<template>
  <PageLayout>
    <PageHeader
      :running="instanceRunning"
      :loading="instanceLoading"
      @refresh="loadInstanceState"
    />
    <UCard class="bg-zinc-900/50 border-zinc-800">
      <dl class="space-y-3">
        <div v-if="user?.name">
          <dt class="text-sm text-zinc-500">Name</dt>
          <dd class="text-zinc-200">{{ user.name }}</dd>
        </div>
        <div v-if="user?.email">
          <dt class="text-sm text-zinc-500">Email</dt>
          <dd class="text-zinc-200">{{ user.email }}</dd>
        </div>
      </dl>
    </UCard>
    <UCard v-if="billing != null" class="bg-zinc-900/50 border-zinc-800 mt-4">
      <template #header>
        <span class="font-medium">Instance billing</span>
      </template>
      <p class="text-sm text-zinc-400 mb-3">
        Billed at ${{ billing.ratePerDay.toFixed(2) }}/day when the instance is running. Stopped instances are not billed. Right now, all instances are completely free and complementary of the developer. This may change at any given moment.
      </p>
      <dl class="space-y-2">
        <div>
          <dt class="text-sm text-zinc-500">Billable days</dt>
          <dd class="text-zinc-200">{{ billing.totalBillableDays.toFixed(2) }}</dd>
        </div>
        <div>
          <dt class="text-sm text-zinc-500">Billable seconds  </dt>
          <dd class="text-zinc-200">{{ billing.totalBillableSeconds.toFixed(2) }}</dd>
        </div>
        <div>
          <dt class="text-sm text-zinc-500">Total amount</dt>
          <dd class="text-zinc-200 font-medium">${{ billing.totalAmount.toFixed(2) }}</dd>
        </div>
      </dl>
    </UCard>
  </PageLayout>
</template>
