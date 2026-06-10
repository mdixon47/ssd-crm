<template>
  <div class="min-h-screen flex" style="background:#060c18">
    <!-- Sidebar -->
    <aside class="w-60 flex-shrink-0 flex flex-col min-h-screen sticky top-0 h-screen" style="background:#0b1120;border-right:1px solid rgba(6,182,212,0.08)">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-3 px-5 py-5 no-underline flex-shrink-0" style="border-bottom:1px solid rgba(148,163,184,0.08)">
        <div class="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0" style="border:1px solid rgba(6,182,212,0.3)">
          <span class="text-cyan-400 text-sm font-black">S</span>
        </div>
        <div>
          <div class="font-bold text-slate-100 text-sm tracking-tight leading-tight">
            SSD <span class="text-cyan-400">Consulting</span>
          </div>
          <div class="text-slate-500 text-xs leading-tight">Paid Acquisition CRM</div>
        </div>
      </NuxtLink>

      <!-- Nav links -->
      <nav class="flex-1 py-3 flex flex-col overflow-y-auto">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-5 py-2.5 text-slate-400 hover:text-slate-100 text-sm font-medium border-l-2 border-transparent transition-all hover:bg-cyan-500/5"
          active-class="!text-cyan-400 border-l-cyan-500 !bg-cyan-500/10"
        >
          <span class="text-base leading-none w-5 text-center">{{ link.icon }}</span>
          <span>{{ link.label }}</span>
        </NuxtLink>
      </nav>

      <!-- AI Assistant -->
      <div class="p-4 flex-shrink-0" style="border-top:1px solid rgba(148,163,184,0.08)">
        <button
          class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-cyan-400 transition-all"
          style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2)"
          @click="aiPanelOpen = !aiPanelOpen"
        >
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
          </svg>
          AI Assistant
          <span class="ml-auto text-cyan-500/60 text-xs">✨</span>
        </button>
      </div>

      <!-- Account -->
      <div
        v-if="user"
        class="px-4 py-3 flex items-center gap-2.5 flex-shrink-0"
        style="border-top:1px solid rgba(148,163,184,0.08)"
      >
        <div class="flex-1 min-w-0">
          <div class="text-slate-500 text-[10px] uppercase tracking-wider leading-tight">
            Signed in
          </div>
          <div class="text-slate-300 text-xs font-medium truncate" :title="user.email || ''">
            {{ user.email }}
          </div>
        </div>
        <button
          class="px-2.5 py-1.5 rounded-md text-slate-400 hover:text-rose-400 text-xs font-medium transition-colors"
          style="border:1px solid rgba(148,163,184,0.12)"
          :disabled="authLoading"
          title="Sign out"
          @click="signOut"
        >
          {{ authLoading ? '…' : 'Sign out' }}
        </button>
      </div>
    </aside>

    <!-- Main content area -->
    <div class="flex-1 flex overflow-hidden min-w-0">
      <main class="flex-1 overflow-auto" style="background:#060c18">
        <slot />
      </main>

      <!-- AI Panel (slide-in from right) -->
      <AIPanel v-if="aiPanelOpen" @close="aiPanelOpen = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AIPanel from '~/components/ai/AIPanel.vue'

const aiPanelOpen = ref(false)
const { user, loading: authLoading, signOut } = useAuth()

const navLinks = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/leads', label: 'Leads & Pipeline', icon: '👥' },
  { to: '/campaigns', label: 'Campaigns', icon: '📢' },
  { to: '/search-terms', label: 'Search Terms', icon: '🔍' },
  { to: '/negative-keywords', label: 'Negative Keywords', icon: '🚫' },
  { to: '/weekly-audit', label: 'Weekly Audit', icon: '✅' },
  { to: '/social', label: 'Social Media', icon: '📱' },
]
</script>
