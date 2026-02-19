export function useIsAdmin() {
  const { loggedIn, user } = useUserSession()
  const isAdmin = ref(false)

  watch(
    () => [loggedIn.value, user.value?.email] as const,
    async ([logged, email]) => {
      if (logged && email) {
        try {
          const r = await $fetch<{ admin?: boolean }>('/api/admin/check')
          isAdmin.value = !!r.admin
        } catch {
          isAdmin.value = false
        }
      } else {
        isAdmin.value = false
      }
    },
    { immediate: true }
  )

  return { isAdmin }
}
