// useAuth — thin wrapper around @nuxtjs/supabase composables.
// Centralizes the sign-in / sign-out flow so callers don't import the
// Supabase client directly.
export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const router = useRouter()

  const loading = ref(false)
  const error = ref<string | null>(null)

  async function signInWithPassword(email: string, password: string, redirect = '/') {
    loading.value = true
    error.value = null
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) {
        error.value = signInError.message
        return false
      }
      await router.push(redirect)
      return true
    }
    finally {
      loading.value = false
    }
  }

  async function signOut() {
    loading.value = true
    error.value = null
    try {
      await supabase.auth.signOut()
      await router.push('/login')
    }
    finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    signInWithPassword,
    signOut,
  }
}
