<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-primary">Performance Dashboard</h1>
        <p class="text-sm text-slate-500 mt-0.5">All channels · {{ currentMonth }}</p>
      </div>
      <div class="flex gap-2">
        <button
          :disabled="auditRunning"
          class="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-500 transition disabled:opacity-50"
          @click="runAudit"
        >
          <span v-if="auditRunning">⏳</span>
          <span v-else>✨</span>
          {{ auditRunning ? 'Running AI Audit...' : 'Run Weekly AI Audit' }}
        </button>
      </div>
    </div>

    <!-- AI Audit Result -->
    <div v-if="auditReport" class="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
      <div class="flex items-start gap-3">
        <span class="text-2xl">✅</span>
        <div>
          <div class="font-semibold text-green-800 mb-1">
            Weekly AI Audit — {{ auditReport.overall_health === 'strong' ? '🟢 Strong' : auditReport.overall_health === 'moderate' ? '🟡 Moderate' : '🔴 Needs Attention' }}
          </div>
          <p class="text-sm text-green-700">{{ auditReport.summary }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span v-for="rec in auditReport.campaigns_to_scale" :key="rec" class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">📈 Scale: {{ rec }}</span>
            <span v-for="rec in auditReport.campaigns_to_pause" :key="rec" class="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">⏸ Review: {{ rec }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- KPI Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
      <div v-for="kpi in kpis" :key="kpi.label" class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{{ kpi.label }}</div>
        <div
          :class="[
            'text-2xl font-bold',
            kpi.highlight === 'good' ? 'text-green-600' : kpi.highlight === 'bad' ? 'text-red-600' : kpi.highlight === 'warn' ? 'text-amber-600' : 'text-primary',
          ]"
        >
          {{ kpi.value }}
        </div>
        <div class="text-xs text-slate-400 mt-1">{{ kpi.sub }}</div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Revenue vs Spend by Channel</div>
        <canvas ref="revenueChartEl" height="180" />
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Lead Funnel (All Channels)</div>
        <canvas ref="funnelChartEl" height="180" />
      </div>
    </div>

    <!-- Campaign Performance Table -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div class="px-5 py-4 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Campaign Performance Summary
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Campaign</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">Spend</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">Leads</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">CPL</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">Revenue</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">ROAS</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500">Signal</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in campaignRows" :key="row.name" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span
                    v-if="row.platform"
                    class="text-xs px-2 py-0.5 rounded-full font-semibold"
                    :class="platformBadgeClass(row.platform)"
                  >{{ row.platform }}</span>
                  <span class="font-medium text-slate-800">{{ row.name }}</span>
                </div>
              </td>
              <td class="px-4 py-3 text-right text-slate-700">${{ row.spend.toLocaleString() }}</td>
              <td class="px-4 py-3 text-right text-slate-700">{{ row.leads }}</td>
              <td class="px-4 py-3 text-right text-slate-500">${{ row.cpl }}</td>
              <td class="px-4 py-3 text-right font-semibold text-slate-800">${{ row.revenue.toLocaleString() }}</td>
              <td
                class="px-4 py-3 text-right font-bold"
                :class="row.roas >= 3 ? 'text-green-600' : row.roas >= 1.5 ? 'text-amber-600' : 'text-red-600'"
              >
                {{ row.roas.toFixed(2) }}x
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="text-xs px-2 py-1 rounded-full font-semibold"
                  :class="row.roas >= 3 ? 'bg-green-100 text-green-700' : row.roas >= 1.5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'"
                >
                  {{ row.roas >= 3 ? 'Scale ↑' : row.roas >= 1.5 ? 'Hold' : 'Review ⚠' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js'
import { useAI } from '~/composables/useAI'
import { GOOGLE_CAMPAIGNS, SOCIAL_PLATFORMS } from '~/lib/mockData'
import type { AuditReport } from '~/types'

Chart.register(...registerables)

const { runWeeklyAudit } = useAI()
const auditRunning = ref(false)
const auditReport = ref<AuditReport | null>(null)

const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

// Build combined channel rows
const campaignRows = computed(() => {
  const google = GOOGLE_CAMPAIGNS.map(c => ({
    name: c.name, platform: 'Google', spend: c.spend, leads: c.leads,
    revenue: c.revenue,
    roas: c.spend > 0 ? c.revenue / c.spend : 0,
    cpl: c.leads > 0 ? (c.spend / c.leads).toFixed(0) : '—',
  }))

  const social = Object.entries(SOCIAL_PLATFORMS).map(([, p]) => {
    const spend = p.campaigns.reduce((s, c) => s + c.spend, 0)
    const leads = p.campaigns.reduce((s, c) => s + c.leads, 0)
    const revenue = p.campaigns.reduce((s, c) => s + c.revenue, 0)
    return {
      name: `${p.name} Ads`, platform: p.name, spend, leads, revenue,
      roas: spend > 0 ? revenue / spend : 0,
      cpl: leads > 0 ? (spend / leads).toFixed(0) : '—',
    }
  })

  return [...google, ...social]
})

const kpis = computed(() => {
  const rows = campaignRows.value
  const totalSpend = rows.reduce((s, r) => s + r.spend, 0)
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0)
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0

  return [
    { label: 'Total Spend', value: `$${totalSpend.toLocaleString()}`, sub: 'All channels' },
    { label: 'Total Leads', value: totalLeads, sub: 'All campaigns' },
    { label: 'Cost / Lead', value: totalLeads > 0 ? `$${cpl.toFixed(0)}` : '—', sub: 'Average' },
    { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, sub: 'Tracked' },
    {
      label: 'ROAS', value: `${roas.toFixed(2)}x`, sub: 'Revenue ÷ Spend',
      highlight: roas >= 3 ? 'good' : roas >= 1.5 ? 'warn' : 'bad',
    },
  ]
})

function platformBadgeClass(platform: string) {
  const map: Record<string, string> = {
    Google: 'bg-blue-100 text-blue-700',
    Facebook: 'bg-blue-50 text-blue-800',
    Instagram: 'bg-pink-100 text-pink-700',
    LinkedIn: 'bg-sky-100 text-sky-700',
  }
  return map[platform] ?? 'bg-slate-100 text-slate-600'
}

// Charts
const revenueChartEl = ref<HTMLCanvasElement>()
const funnelChartEl = ref<HTMLCanvasElement>()
let revenueChart: Chart | null = null
let funnelChart: Chart | null = null

onMounted(() => {
  if (revenueChartEl.value) {
    revenueChart = new Chart(revenueChartEl.value, {
      type: 'bar',
      data: {
        labels: campaignRows.value.map(r => r.name.substring(0, 18)),
        datasets: [
          { label: 'Revenue', data: campaignRows.value.map(r => r.revenue), backgroundColor: '#1a3c6ecc', borderRadius: 4 },
          { label: 'Spend', data: campaignRows.value.map(r => r.spend), backgroundColor: '#dce3ef', borderRadius: 4 },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }, scales: { y: { beginAtZero: true } } },
    })
  }

  const funnel = [
    { label: 'Leads', value: campaignRows.value.reduce((s, r) => s + r.leads, 0) },
    { label: 'Qualified', value: 55 },
    { label: 'Booked', value: 32 },
    { label: 'Converted', value: 18 },
  ]

  if (funnelChartEl.value) {
    funnelChart = new Chart(funnelChartEl.value, {
      type: 'bar',
      data: {
        labels: funnel.map(f => f.label),
        datasets: [{ label: 'Leads', data: funnel.map(f => f.value), backgroundColor: ['#3a7bd5cc', '#22a053cc', '#e8a020cc', '#1a3c6ecc'], borderRadius: 4 }],
      },
      options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } },
    })
  }
})

onUnmounted(() => { revenueChart?.destroy(); funnelChart?.destroy() })

async function runAudit() {
  auditRunning.value = true
  try {
    auditReport.value = await runWeeklyAudit()
  }
  finally {
    auditRunning.value = false
  }
}
</script>
