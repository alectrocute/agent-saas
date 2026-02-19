const PUBLIC_PATHS = ['/login', '/welcome']

export default defineNuxtRouteMiddleware(async (to) => {
  if (PUBLIC_PATHS.includes(to.path)) return

  const { loggedIn, fetch: fetchSession } = useUserSession()
  
  await fetchSession()

  if (!loggedIn.value) {
    return navigateTo('/welcome')
  }
})
