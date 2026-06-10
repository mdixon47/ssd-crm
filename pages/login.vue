<template>
  <div class="min-h-screen flex items-center justify-center px-4" style="background:#060c18">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="flex items-center gap-3 mb-8 justify-center">
        <div
          class="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center"
          style="border:1px solid rgba(6,182,212,0.3)"
        >
          <span class="text-cyan-400 text-base font-black">S</span>
        </div>
        <div>
          <div class="font-bold text-slate-100 text-base tracking-tight leading-tight">
            SSD <span class="text-cyan-400">Consulting</span>
          </div>
          <div class="text-slate-500 text-xs leading-tight">Paid Acquisition CRM</div>
        </div>
      </div>

      <!-- Card -->
      <form
        class="rounded-xl p-6"
        style="background:#0b1120;border:1px solid rgba(148,163,184,0.08)"
        @submit.prevent="onSubmit"
      >
        <h1 class="text-slate-100 text-lg font-semibold mb-1">
          Sign in
        </h1>
        <p class="text-slate-500 text-xs mb-5">
          Use your team account to continue.
        </p>

        <label class="block text-slate-300 text-xs font-medium mb-1.5" for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          class="w-full px-3 py-2 rounded-lg bg-slate-900/60 text-slate-100 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          style="border:1px solid rgba(148,163,184,0.12)"
          :disabled="loading"
        >

        <label class="block text-slate-300 text-xs font-medium mb-1.5" for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          class="w-full px-3 py-2 rounded-lg bg-slate-900/60 text-slate-100 text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          style="border:1px solid rgba(148,163,184,0.12)"
          :disabled="loading"
        >

        <p
          v-if="error"
          class="text-rose-400 text-xs mb-4"
          role="alert"
        >
          {{ error }}
        </p>

        <button
          type="submit"
          class="w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-cyan-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style="background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.3)"
          :disabled="loading || !email || !password"
        >
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>

        <p class="text-slate-500 text-xs mt-5 text-center">
          Need access? Contact your administrator.
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const { loading, error, signInWithPassword } = useAuth()

const email = ref('')
const password = ref('')

async function onSubmit() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
  await signInWithPassword(email.value, password.value, redirect)
}
</script>
