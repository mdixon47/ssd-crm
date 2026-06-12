<template>
  <div class="p-6 max-w-2xl mx-auto">
    <div class="flex items-center gap-4 mb-6">
      <NuxtLink to="/" class="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">← Back</NuxtLink>
      <h1 class="text-2xl font-bold text-cyan-400">Account</h1>
    </div>

    <!-- Profile -->
    <section class="rounded-xl p-6 mb-6" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
      <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4" style="border-bottom:1px solid rgba(148,163,184,0.08);padding-bottom:0.75rem">
        Profile
      </h2>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Email</label>
          <input
            :value="user?.email ?? ''"
            disabled
            class="w-full rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
            style="background:#070c18;border:1px solid rgba(148,163,184,0.1)"
          >
          <p class="text-slate-600 text-xs mt-1">Email cannot be changed here. Contact your administrator.</p>
        </div>

        <form @submit.prevent="onSaveProfile">
          <label for="account-fullname" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Full name</label>
          <input
            id="account-fullname"
            v-model="fullName"
            type="text"
            autocomplete="name"
            class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
            style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
            :disabled="loading"
          >

          <div class="flex items-center justify-between gap-3 mt-4">
            <p v-if="profileMsg" :class="profileOk ? 'text-emerald-400' : 'text-rose-400'" class="text-xs">{{ profileMsg }}</p>
            <button
              type="submit"
              class="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style="background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.3)"
              :disabled="loading || !fullName.trim() || fullName.trim() === initialFullName"
            >
              {{ loading ? 'Saving…' : 'Save profile' }}
            </button>
          </div>
        </form>
      </div>
    </section>

    <!-- Password -->
    <section class="rounded-xl p-6" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
      <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4" style="border-bottom:1px solid rgba(148,163,184,0.08);padding-bottom:0.75rem">
        Change password
      </h2>

      <form class="space-y-4" @submit.prevent="onChangePassword">
        <div>
          <label for="account-current" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Current password</label>
          <input
            id="account-current"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            required
            class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
            style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
            :disabled="loading"
          >
        </div>
        <div>
          <label for="account-new" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">New password</label>
          <input
            id="account-new"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            minlength="8"
            required
            class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
            style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
            :disabled="loading"
          >
          <p class="text-slate-600 text-xs mt-1">At least 8 characters.</p>
        </div>
        <div>
          <label for="account-confirm" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Confirm new password</label>
          <input
            id="account-confirm"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
            style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
            :disabled="loading"
          >
        </div>

        <div class="flex items-center justify-between gap-3 pt-2">
          <p v-if="passwordMsg" :class="passwordOk ? 'text-emerald-400' : 'text-rose-400'" class="text-xs">{{ passwordMsg }}</p>
          <button
            type="submit"
            class="ml-auto px-4 py-2 rounded-lg text-sm font-semibold text-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style="background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.3)"
            :disabled="loading || !currentPassword || newPassword.length < 8 || newPassword !== confirmPassword"
          >
            {{ loading ? 'Updating…' : 'Update password' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
const { user, loading, error, updateProfile, updatePassword } = useAuth()

const initialFullName = computed(() => {
  const meta = user.value?.user_metadata as { full_name?: string } | undefined
  return meta?.full_name?.trim() ?? ''
})
const fullName = ref(initialFullName.value)
watch(initialFullName, v => { if (!fullName.value) fullName.value = v })

const profileMsg = ref('')
const profileOk = ref(false)

async function onSaveProfile() {
  profileMsg.value = ''
  const ok = await updateProfile(fullName.value)
  profileOk.value = ok
  profileMsg.value = ok ? 'Profile updated.' : (error.value || 'Update failed.')
}

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordMsg = ref('')
const passwordOk = ref(false)

async function onChangePassword() {
  passwordMsg.value = ''
  if (newPassword.value !== confirmPassword.value) {
    passwordOk.value = false
    passwordMsg.value = 'New passwords do not match.'
    return
  }
  const ok = await updatePassword(currentPassword.value, newPassword.value)
  passwordOk.value = ok
  passwordMsg.value = ok ? 'Password updated.' : (error.value || 'Update failed.')
  if (ok) {
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }
}
</script>
