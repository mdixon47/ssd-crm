<template>
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <aside class="w-56 bg-primary flex-shrink-0 flex flex-col min-h-screen sticky top-0 h-screen">
      <!-- Logo -->
      <NuxtLink to="/" class="flex items-center gap-2 px-5 py-5 no-underline border-b border-white/10 flex-shrink-0">
        <div>
          <div class="font-bold text-white text-base tracking-tight leading-tight">
            SSD <span class="text-accent">Consulting</span>
          </div>
          <div class="text-white/40 text-xs leading-tight">Paid Acquisition CRM</div>
        </div>
      </NuxtLink>

      <!-- Nav links -->
      <nav class="flex-1 py-3 flex flex-col overflow-y-auto">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="flex items-center gap-3 px-5 py-2.5 text-white/65 hover:text-white text-sm font-medium border-l-3 border-transparent transition-colors hover:bg-white/5"
          active-class="!text-white border-l-accent !bg-white/10"
        >
          <span class="text-base leading-none">{{ link.icon }}</span>
          <span>{{ link.label }}</span>
        </NuxtLink>
      </nav>

      <!-- AI Assistant -->
      <div class="p-4 border-t border-white/10 flex-shrink-0">
        <button
          class="w-full flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
          @click="aiPanelOpen = !aiPanelOpen"
        >
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
          </svg>
          AI Assistant
        </button>
      </div>
    </aside>

    <!-- Main content area -->
    <div class="flex-1 flex overflow-hidden min-w-0">
      <main class="flex-1 overflow-auto bg-slate-50">
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

<style>
.border-l-3 { border-left-width: 3px; }
.border-l-accent { border-left-color: #e8a020; }
</style>
