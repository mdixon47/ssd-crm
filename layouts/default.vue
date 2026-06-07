<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Header -->
    <header class="bg-primary text-white h-15 flex items-center px-6 shadow-md flex-shrink-0">
      <NuxtLink to="/" class="flex items-center gap-3 no-underline">
        <span class="font-bold text-lg tracking-tight">
          SSD <span class="text-accent">Consulting</span>
        </span>
        <span class="text-white/50 text-xs hidden sm:block">Paid Acquisition CRM</span>
      </NuxtLink>
      <div class="ml-auto flex items-center gap-3">
        <span class="text-xs text-white/60 hidden md:block">
          Google Ads · Facebook · Instagram · LinkedIn
        </span>
        <!-- AI Panel Toggle -->
        <button
          class="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          @click="aiPanelOpen = !aiPanelOpen"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
          </svg>
          <span class="hidden sm:block">AI Assistant</span>
        </button>
      </div>
    </header>

    <!-- Navigation -->
    <nav class="bg-primary-light flex overflow-x-auto flex-shrink-0">
      <NuxtLink
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        class="px-4 py-3 text-white/70 hover:text-white text-sm font-medium whitespace-nowrap border-b-3 border-transparent transition-colors"
        active-class="text-white border-b-accent border-accent"
      >
        {{ link.icon }} {{ link.label }}
      </NuxtLink>
    </nav>

    <!-- Main content + AI Panel -->
    <div class="flex flex-1 overflow-hidden">
      <main class="flex-1 overflow-auto">
        <slot />
      </main>

      <!-- AI Panel (slide-in) -->
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
.border-b-3 { border-bottom-width: 3px; }
.border-b-accent { border-bottom-color: #e8a020; }
</style>
