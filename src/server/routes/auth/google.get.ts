export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        id: user.sub,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        picture: user.picture ?? undefined,
      },
      loggedInAt: Date.now(),
    })
    return sendRedirect(event, '/')
  },
})
