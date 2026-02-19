const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useUserEmail() {
  const { loggedIn, user } = useUserSession()
  const effectiveEmail = computed(() =>
    loggedIn.value && user.value?.email ? user.value.email : ''
  )

  function getEmailOrThrow(): string {
    const email = effectiveEmail.value.trim()
    if (!email) throw new Error('Email is required')
    if (!EMAIL_REGEX.test(email)) throw new Error('Invalid email format')
    return email
  }

  function isEmailValid(email: string): boolean {
    return EMAIL_REGEX.test(email.trim())
  }

  return { effectiveEmail, getEmailOrThrow, isEmailValid }
}
