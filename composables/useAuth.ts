// useAuth — thin wrapper around @nuxtjs/supabase composables.
// Centralizes the sign-in / sign-out / profile flow so callers don't import
// the Supabase client directly.
export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const router = useRouter()

  const loading = ref(false)
  const error = ref<string | null>(null)

  // Prefer user_metadata.full_name; fall back to the local-part of the email.
  const displayName = computed(() => {
    const meta = user.value?.user_metadata as { full_name?: string } | undefined
    return meta?.full_name?.trim() || user.value?.email?.split('@')[0] || ''
  })

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

  // Updates user_metadata.full_name. Does not touch email — email changes
  // require Supabase confirmation flow which is not wired up.
  async function updateProfile(fullName: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      })
      if (updateError) {
        error.value = updateError.message
        return false
      }
      return true
    }
    finally {
      loading.value = false
    }
  }

  // Verifies the current password by re-running signInWithPassword (which
  // refreshes the session as a side-effect), then sets the new password.
  async function updatePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    loading.value = true
    error.value = null
    try {
      const email = user.value?.email
      if (!email) {
        error.value = 'Not signed in'
        return false
      }
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
      if (verifyError) {
        error.value = 'Current password is incorrect'
        return false
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
      if (updateError) {
        error.value = updateError.message
        return false
      }
      return true
    }
    finally {
      loading.value = false
    }
  }

  return {
    user,
    loading,
    error,
    displayName,
    signInWithPassword,
    signOut,
    updateProfile,
    updatePassword,
  }
}
