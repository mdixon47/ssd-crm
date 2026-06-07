<template>
  <div class="p-6 max-w-4xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-cyan-400">Weekly Optimization Audit</h1>
        <p class="text-sm text-slate-500 mt-0.5">Week of {{ weekDate }}</p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm font-bold" :class="progressPct >= 80 ? 'text-emerald-400' : 'text-slate-500'">
          {{ progressPct }}% complete
        </span>
        <button
          :disabled="auditRunning"
          class="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          @click="runAIAudit"
        >
          <span>✨</span>
          {{ auditRunning ? 'Running Claude Audit...' : 'Run AI Audit Report' }}
        </button>
        <button
          class="text-sm text-slate-400 hover:text-slate-200 transition-colors px-3 py-2 rounded-lg"
          style="border:1px solid rgba(148,163,184,0.2)"
          @click="resetChecklist"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="w-full rounded-full h-1.5 mb-6" style="background:rgba(148,163,184,0.1)">
      <div
        class="h-1.5 rounded-full transition-all duration-500"
        :class="progressPct >= 80 ? 'bg-emerald-400' : 'bg-cyan-500'"
        :style="{ width: `${progressPct}%` }"
      />
    </div>

    <!-- AI Report -->
    <div v-if="auditReport" class="mb-6 rounded-xl p-5 shadow-2xl" style="background:#0d1628;border:1px solid rgba(6,182,212,0.2)">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-2xl">✨</span>
        <div>
          <div class="font-bold text-cyan-400 text-base">AI Audit Report — Generated {{ new Date(auditReport.generated_at).toLocaleString() }}</div>
          <div
            class="text-sm font-semibold"
            :class="auditReport.overall_health === 'strong' ? 'text-emerald-400' : auditReport.overall_health === 'moderate' ? 'text-amber-400' : 'text-red-400'"
          >
            {{ auditReport.overall_health === 'strong' ? '🟢 Overall: Strong' : auditReport.overall_health === 'moderate' ? '🟡 Overall: Moderate' : '🔴 Overall: Needs Attention' }}
          </div>
        </div>
      </div>

      <p class="text-sm text-slate-400 mb-4 leading-relaxed">{{ auditReport.summary }}</p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <AuditReportSection title="📈 Scale These" :items="auditReport.campaigns_to_scale" color="emerald" />
        <AuditReportSection title="⏸ Review / Pause" :items="auditReport.campaigns_to_pause" color="red" />
        <AuditReportSection title="🚫 Negative KW Suggestions" :items="auditReport.negative_keyword_suggestions" color="orange" />
        <AuditReportSection title="⚠️ Landing Page Issues" :items="auditReport.landing_page_issues" color="amber" />
        <AuditReportSection title="💰 Budget Recommendations" :items="auditReport.budget_recommendations" color="blue" />
        <AuditReportSection title="🔧 Tracking Issues" :items="auditReport.tracking_issues" color="slate" />
        <AuditReportSection title="❓ Questions for Human Review" :items="auditReport.questions_for_review" color="purple" />
      </div>
    </div>

    <!-- Manual Checklist -->
    <div
      v-for="(step, si) in AUDIT_STEPS"
      :key="si"
      class="rounded-xl mb-4 overflow-hidden"
      style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)"
    >
      <button
        class="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-cyan-500/5 transition-colors"
        @click="toggleStep(si)"
      >
        <div
          class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
          :class="isStepComplete(si) ? 'bg-emerald-500' : 'bg-cyan-700'"
        >
          {{ isStepComplete(si) ? '✓' : si + 1 }}
        </div>
        <div class="flex-1 font-semibold text-slate-200">{{ step.title }}</div>
        <div class="text-xs text-slate-600 mr-2">{{ stepDone(si) }}/{{ step.checks.length }}</div>
        <span class="text-slate-500 text-lg">{{ openSteps[si] ? '▾' : '▸' }}</span>
      </button>

      <div
        v-if="openSteps[si]"
        class="px-5 pb-5 pl-14 space-y-3 pt-4"
        style="border-top:1px solid rgba(148,163,184,0.07)"
      >
        <label
          v-for="(check, ci) in step.checks"
          :key="ci"
          class="flex items-start gap-3 cursor-pointer group"
        >
          <input
            v-model="checklist[`${si}_${ci}`]"
            type="checkbox"
            class="mt-0.5 w-4 h-4 accent-cyan-500"
          >
          <span
            class="text-sm transition-colors"
            :class="checklist[`${si}_${ci}`] ? 'line-through text-slate-600' : 'text-slate-300'"
          >{{ check }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAI } from '~/composables/useAI'
import type { AuditReport } from '~/types'

const { runWeeklyAudit } = useAI()

const auditRunning = ref(false)
const auditReport = ref<AuditReport | null>(null)
const weekDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

const AUDIT_STEPS = [
  {
    title: 'Step 1: Pull Campaign Data',
    checks: [
      'Export campaign performance report from Google Ads',
      'Record spend, clicks, and conversions for each campaign',
      'Note cost per lead for each campaign',
      'Check qualified leads from CRM against ad leads',
      'Calculate this week\'s ROAS per campaign',
    ],
  },
  {
    title: 'Step 2: Pull & Label Search Terms',
    checks: [
      'Export search terms report from Google Ads',
      'Add new terms to Search Terms tab and label each one',
      'Flag "Add Negative" terms for blocklist',
      'Identify "Build Page" opportunities',
      'Note any "New Campaign" demand signals',
    ],
  },
  {
    title: 'Step 3: Review Lead Quality in CRM',
    checks: [
      'Open leads added this week — check stage and qualified status',
      'Flag any leads from bad-fit searches (add keyword to negatives)',
      'Update revenue amounts for new enrollments or clients closed',
      'Move stale leads to Lost/No Response if 14+ days no contact',
      'Identify leads ready to upsell (course buyer → consulting)',
    ],
  },
  {
    title: 'Step 4: Make Controlled Changes (Human Approval Required)',
    checks: [
      'Add labeled negative keywords to Google Ads (after human review)',
      'Pause any ad with zero conversions and 3x target CPA spent',
      'Shift budget from low-ROAS to high-ROAS campaigns (with approval)',
      'Improve landing page copy based on high-performing search terms',
      'Add new ad group for any "New Campaign" search term signal',
    ],
  },
  {
    title: 'Step 5: Run AI Audit (Claude)',
    checks: [
      'Click "Run AI Audit Report" button above',
      'Review: campaigns to scale, campaigns to pause',
      'Review: negative keyword recommendations',
      'Review: landing page issues and tracking gaps',
      'Human approves or rejects each recommendation before acting',
    ],
  },
  {
    title: 'Step 6: Upload Offline Conversions',
    checks: [
      'Identify leads that converted to paying clients this week',
      'Record GCLID + conversion value for each',
      'Use Google Ads MCP tool (dry_run first) to validate',
      'Upload to Google Ads offline conversions after human approval',
      'Confirm upload was successful in Google Ads interface',
    ],
  },
]

const checklist = reactive<Record<string, boolean>>({})
const openSteps = reactive<Record<number, boolean>>({})

const progressPct = computed(() => {
  const total = AUDIT_STEPS.reduce((s, st) => s + st.checks.length, 0)
  const done = Object.values(checklist).filter(Boolean).length
  return Math.round(done / total * 100)
})

function isStepComplete(si: number) {
  return AUDIT_STEPS[si].checks.every((_, ci) => checklist[`${si}_${ci}`])
}

function stepDone(si: number) {
  return AUDIT_STEPS[si].checks.filter((_, ci) => checklist[`${si}_${ci}`]).length
}

function toggleStep(si: number) {
  openSteps[si] = !openSteps[si]
}

function resetChecklist() {
  Object.keys(checklist).forEach(k => { checklist[k] = false })
}

async function runAIAudit() {
  auditRunning.value = true
  try {
    auditReport.value = await runWeeklyAudit()
    AUDIT_STEPS[4].checks.forEach((_, ci) => { checklist[`4_${ci}`] = true })
  }
  finally {
    auditRunning.value = false
  }
}

const COLOR_MAP: Record<string, string> = {
  emerald: 'rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2)',
  red: 'rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2)',
  orange: 'rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.2)',
  amber: 'rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2)',
  blue: 'rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2)',
  slate: 'rgba(148,163,184,0.06);border:1px solid rgba(148,163,184,0.12)',
  purple: 'rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2)',
}

const TEXT_MAP: Record<string, string> = {
  emerald: 'text-emerald-400', red: 'text-red-400', orange: 'text-orange-400',
  amber: 'text-amber-400', blue: 'text-blue-400', slate: 'text-slate-400', purple: 'text-purple-400',
}

const AuditReportSection = defineComponent({
  props: {
    title: { type: String, default: '' },
    items: { type: Array as () => string[], default: () => [] },
    color: { type: String, default: 'slate' },
  },
  setup(props) {
    return () => {
      if (!props.items?.length) return null
      const bg = COLOR_MAP[props.color || 'slate']
      const tc = TEXT_MAP[props.color || 'slate']
      return h('div', { class: 'rounded-xl p-4', style: `background:${bg}` }, [
        h('div', { class: `font-semibold text-sm mb-2 ${tc}` }, props.title),
        h('ul', { class: 'space-y-1' },
          props.items?.map(item => h('li', { class: 'text-xs text-slate-400 flex gap-2' }, [
            h('span', { class: 'text-slate-600 flex-shrink-0' }, '•'),
            item,
          ])),
        ),
      ])
    }
  },
})
</script>
