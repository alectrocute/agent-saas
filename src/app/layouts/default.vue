<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const { loggedIn, user, clear } = useUserSession()
const { isAdmin } = useIsAdmin()
const toast = useToast()

const navTitle = computed(() => {
  const meta = route.meta?.title
  if (typeof meta === 'string') return meta
  const path = route.path
  if (path === '/') return 'Dashboard'
  if (path.startsWith('/manage')) return 'Manage'
  if (path.startsWith('/account')) return 'Account'
  if (path.startsWith('/admin')) return 'Admin'
  return 'Dashboard'
})

const mainNavItems = computed<NavigationMenuItem[]>(() => {
  const items: NavigationMenuItem[] = [
    { label: 'Dashboard', icon: 'i-heroicons-squares-2x2', to: '/', onSelect: () => {} },
  ]
  if (loggedIn.value) {
    items.push(
      { label: 'Manage', icon: 'i-heroicons-cog-6-tooth', to: '/manage', onSelect: () => {} },
      { label: 'Account', icon: 'i-heroicons-user-circle', to: '/account', onSelect: () => {} }
    )
    if (isAdmin.value) {
      items.push({ label: 'Admin', icon: 'i-heroicons-shield-check', to: '/admin', onSelect: () => {} })
    }
  }
  return items
})

async function onSignOut() {
  await clear()
  await navigateTo('/welcome')
  toast.add({ title: 'You\'ve been signed out', color: 'success'})
}
</script>

<template>
  <UDashboardGroup storage-key="picohost-dashboard">
    <UDashboardSidebar v-if="loggedIn" collapsible resizable :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <NuxtLink v-if="!collapsed" to="/" class="flex items-center gap-2 font-semibold text-primary">
          <span class="truncate font-mono">agents.alec.is</span>
        </NuxtLink>
        <NuxtLink v-else to="/" class="flex size-9 items-center justify-center rounded-lg text-primary">
          <UIcon name="i-heroicons-cube" class="size-5" />
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="mainNavItems"
          orientation="vertical"
        />
      </template>

      <template #footer="{ collapsed }">
        <div v-if="loggedIn" class="w-full">
          <UDropdownMenu
            :items="[[{ label: 'Sign out', icon: 'i-heroicons-arrow-right-on-rectangle', onSelect: onSignOut }]]"
          >
            <UButton color="neutral" variant="ghost" class="w-full" :block="collapsed" size="sm">
              <UAvatar :alt="user?.name ?? user?.email ?? 'User'" size="xs" />
              <span v-if="!collapsed" class="truncate ms-2">{{ user?.name ?? user?.email ?? 'Account' }}</span>
              <UIcon v-if="!collapsed" name="i-heroicons-chevron-down-20-solid" class="ms-auto size-4 opacity-50" />
            </UButton>
          </UDropdownMenu>
        </div>
        <NuxtLink v-else to="/login" class="block w-full">
          <UButton color="primary" variant="soft" class="w-full gap-2" :square="collapsed" size="sm">
            <UIcon name="i-simple-icons-google" class="size-4 shrink-0" />
            <span v-if="!collapsed">Sign in</span>
          </UButton>
        </NuxtLink>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar :title="navTitle">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
