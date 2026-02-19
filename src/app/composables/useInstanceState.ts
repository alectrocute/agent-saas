export function useInstanceState() {
  const { getEmailOrThrow } = useUserEmail()
  const instanceRunning = ref(false)
  const instanceLoading = ref(false)

  async function loadInstanceState() {
    instanceLoading.value = true
    try {
      getEmailOrThrow()
      const res = await $fetch<{ running?: boolean }>('/api/instance/state')
      instanceRunning.value = res?.running === true
    } catch {
      instanceRunning.value = false
    } finally {
      instanceLoading.value = false
    }
  }

  return { instanceRunning, instanceLoading, loadInstanceState }
}
