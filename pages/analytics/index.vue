<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-cyan-400">Website Analytics</h1>
        <span
          class="text-xs px-2.5 py-1 rounded-full font-semibold"
          :class="overview?.mode === 'live' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'"
        >
          {{ overview?.mode === 'live' ? '● GA4 Live' : '○ Mock data' }}
        </span>
      </div>

      <!-- Range selector -->
      <div class="flex gap-1 rounded-lg p-1" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <button
          v-for="r in RANGES"
          :key="r.value"
          :class="['px-3 py-1.5 rounded-md text-sm font-medium transition-colors', range === r.value ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200']"
          @click="range = r.value"
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <div v-if="pending && !overview" class="text-slate-400 py-20 text-center">Loading analytics…</div>
    <div v-else-if="error" class="rounded-xl p-5 text-red-400" style="background:#0d1628;border:1px solid rgba(248,113,113,0.3)">
      Failed to load analytics: {{ error.message }}
    </div>

    <template v-else-if="overview">
      <!-- KPI cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <div v-for="kpi in kpis" :key="kpi.label" class="rounded-xl px-4 py-3.5" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
          <div class="text-xs text-slate-500 mb-1">{{ kpi.label }}</div>
          <div class="text-xl font-bold" :class="kpi.color ?? 'text-slate-100'">{{ kpi.value }}</div>
        </div>
      </div>

      <!-- Sessions timeseries -->
      <div class="rounded-xl p-5 mb-8" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="text-sm font-semibold text-slate-300 mb-4">Sessions over time</div>
        <div class="flex items-end gap-0.5 h-32">
          <div
            v-for="pt in overview.timeseries"
            :key="pt.date"
            class="flex-1 rounded-t bg-cyan-500/70 hover:bg-cyan-400 transition-colors"
            :style="{ height: `${maxSessions ? (pt.sessions / maxSessions) * 100 : 0}%` }"
            :title="`${pt.date}: ${pt.sessions.toLocaleString()} sessions`"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Acquisition channels -->
        <div class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
          <div class="px-5 py-3.5 text-sm font-semibold text-slate-300" style="border-bottom:1px solid rgba(148,163,184,0.07)">
            Acquisition Channels
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-slate-500 text-left">
                <th class="px-5 py-2 font-medium">Channel</th>
                <th class="px-3 py-2 font-medium text-right">Sessions</th>
                <th class="px-3 py-2 font-medium text-right">Conv.</th>
                <th class="px-5 py-2 font-medium text-right">Engaged</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in overview.channels" :key="c.channel" style="border-top:1px solid rgba(148,163,184,0.06)">
                <td class="px-5 py-2.5 text-slate-200">{{ c.channel }}</td>
                <td class="px-3 py-2.5 text-right text-slate-300">{{ c.sessions.toLocaleString() }}</td>
                <td class="px-3 py-2.5 text-right text-emerald-400 font-medium">{{ c.conversions.toLocaleString() }}</td>
                <td class="px-5 py-2.5 text-right text-slate-400">{{ pct(c.engagementRate) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Conversion events -->
        <div class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
          <div class="px-5 py-3.5 text-sm font-semibold text-slate-300" style="border-bottom:1px solid rgba(148,163,184,0.07)">
            Conversion Events
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-slate-500 text-left">
                <th class="px-5 py-2 font-medium">Event</th>
                <th class="px-3 py-2 font-medium text-right">Count</th>
                <th class="px-5 py-2 font-medium text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in overview.conversionEvents" :key="e.event" style="border-top:1px solid rgba(148,163,184,0.06)">
                <td class="px-5 py-2.5 text-slate-200 font-mono text-xs">{{ e.event }}</td>
                <td class="px-3 py-2.5 text-right text-slate-300">{{ e.count.toLocaleString() }}</td>
                <td class="px-5 py-2.5 text-right text-emerald-400">{{ e.value ? `$${e.value.toLocaleString()}` : '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Top landing pages -->
      <div class="rounded-xl overflow-hidden mb-6" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-5 py-3.5 text-sm font-semibold text-slate-300" style="border-bottom:1px solid rgba(148,163,184,0.07)">
          Top Landing Pages
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-xs text-slate-500 text-left">
              <th class="px-5 py-2 font-medium">Path</th>
              <th class="px-3 py-2 font-medium text-right">Sessions</th>
              <th class="px-3 py-2 font-medium text-right">Conv. Rate</th>
              <th class="px-5 py-2 font-medium text-right">Bounce</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in overview.topLandingPages" :key="p.path" style="border-top:1px solid rgba(148,163,184,0.06)">
              <td class="px-5 py-2.5 text-slate-200 font-mono text-xs">{{ p.path }}</td>
              <td class="px-3 py-2.5 text-right text-slate-300">{{ p.sessions.toLocaleString() }}</td>
              <td class="px-3 py-2.5 text-right font-medium" :class="p.conversionRate >= 0.02 ? 'text-emerald-400' : p.conversionRate >= 0.01 ? 'text-amber-400' : 'text-slate-400'">
                {{ pct(p.conversionRate) }}
              </td>
              <td class="px-5 py-2.5 text-right text-slate-400">{{ pct(p.bounceRate) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="overview.mode === 'mock'" class="text-xs text-slate-500">
        Showing mock data. Set <code class="text-slate-400">GA4_PROPERTY_ID</code> and service-account credentials in <code class="text-slate-400">.env</code> to display live Google Analytics.
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { GADateRange, GAOverview } from '~/types'

const RANGES: { label: string; value: GADateRange }[] = [
  { label: '7d', value: 'LAST_7_DAYS' },
  { label: '14d', value: 'LAST_14_DAYS' },
  { label: '30d', value: 'LAST_30_DAYS' },
  { label: '90d', value: 'LAST_90_DAYS' },
]

const range = ref<GADateRange>('LAST_30_DAYS')

const { data, pending, error } = await useFetch<{ data: GAOverview }>('/api/analytics', {
  query: { range },
})

const overview = computed(() => data.value?.data)
const maxSessions = computed(() => Math.max(1, ...(overview.value?.timeseries.map(p => p.sessions) ?? [0])))

const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const duration = (s: number) => `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`

const kpis = computed(() => {
  const t = overview.value?.totals
  if (!t) return []
  return [
    { label: 'Sessions', value: t.sessions.toLocaleString() },
    { label: 'Users', value: t.users.toLocaleString() },
    { label: 'Conversions', value: t.conversions.toLocaleString(), color: 'text-emerald-400' },
    { label: 'Conv. Value', value: `$${t.conversionValue.toLocaleString()}`, color: 'text-emerald-400' },
    { label: 'Engagement', value: pct(t.engagementRate) },
    { label: 'Avg. Session', value: duration(t.avgSessionDuration) },
  ]
})
</script>
