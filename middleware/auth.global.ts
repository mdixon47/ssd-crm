// Global route middleware — runs before every page navigation.
// Redirects unauthenticated visitors to /login and prevents
// authenticated users from re-visiting the login screen.
//
// Server-side enforcement lives in server/middleware/auth.ts; this
// middleware exists for UX (no flash of protected content) and SPA
// navigation.
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  const isLogin = to.path === '/login'

  if (!user.value && !isLogin) {
    return navigateTo({
      path: '/login',
      query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined,
    })
  }

  if (user.value && isLogin) {
    return navigateTo('/')
  }
})
