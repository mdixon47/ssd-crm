<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.75);" @click.self="$emit('close')">
    <div class="rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl" style="background:#0d1628;border:1px solid rgba(6,182,212,0.15)">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 sticky top-0" style="background:#0d1628;border-bottom:1px solid rgba(148,163,184,0.08)">
        <h3 class="font-bold text-cyan-400 text-lg">{{ lead.fname }} {{ lead.lname }}</h3>
        <button class="text-slate-500 hover:text-slate-200 text-2xl leading-none transition-colors" @click="$emit('close')">×</button>
      </div>

      <!-- Tabs -->
      <div class="flex px-6" style="border-bottom:1px solid rgba(148,163,184,0.08)">
        <button
          v-for="tab in tabs"
          :key="tab"
          class="py-2.5 px-1 mr-5 text-sm font-medium border-b-2 transition-colors"
          :class="activeTab === tab
            ? 'border-cyan-500 text-cyan-400'
            : 'border-transparent text-slate-500 hover:text-slate-300'"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>

      <!-- Details Tab -->
      <div v-if="activeTab === 'Details'" class="px-6 py-5 space-y-5">
        <!-- Contact info -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase mb-1">Contact</div>
            <p class="text-slate-300">{{ lead.email }}</p>
            <p v-if="lead.phone" class="text-slate-400">{{ lead.phone }}</p>
            <p v-if="lead.title" class="text-slate-400">{{ lead.title }}</p>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase mb-1">Ad Tracking</div>
            <p class="font-mono text-xs text-slate-500 leading-relaxed">
              Source: {{ lead.source || '—' }}<br>
              Campaign: {{ lead.campaign || '—' }}<br>
              Keyword: {{ lead.keyword || '—' }}<br>
              GCLID: {{ lead.gclid ? lead.gclid.slice(0, 12) + '...' : '—' }}
            </p>
          </div>
        </div>

        <!-- AI Score -->
        <div v-if="aiScore" class="rounded-xl p-4" style="background:rgba(6,182,212,0.05);border:1px solid rgba(6,182,212,0.2)">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-slate-500 uppercase">AI Lead Score</div>
            <div
              class="text-lg font-black"
              :class="aiScore.score >= 7 ? 'text-emerald-400' : aiScore.score >= 4 ? 'text-amber-400' : 'text-red-400'"
            >
              {{ aiScore.score }}/10 · Tier {{ aiScore.tier }}
            </div>
          </div>
          <p class="text-sm text-slate-400 mb-2">{{ aiScore.reasoning }}</p>
          <p class="text-sm font-medium text-cyan-400">→ {{ aiScore.recommended_next_step }}</p>
          <p class="text-xs text-slate-500 mt-1">Est. value: {{ aiScore.estimated_deal_value }}</p>
        </div>

        <!-- Stage + Revenue -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="modal-stage" class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Stage</label>
            <select id="modal-stage" v-model="form.stage" class="w-full rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)">
              <option v-for="s in STAGES" :key="s">{{ s }}</option>
            </select>
          </div>
          <div>
            <label for="modal-revenue" class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Revenue ($)</label>
            <input id="modal-revenue" v-model.number="form.revenue" type="number" min="0" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)">
          </div>
        </div>

        <!-- Assignee -->
        <div>
          <label for="modal-assignee" class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Assignee</label>
          <input
            id="modal-assignee"
            v-model="form.assignee"
            list="modal-assignee-list"
            placeholder="Unassigned"
            class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
            style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
          >
          <datalist id="modal-assignee-list">
            <option v-for="a in leadsStore.distinctAssignees" :key="a" :value="a" />
          </datalist>
        </div>

        <div>
          <label for="modal-notes" class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Notes</label>
          <textarea id="modal-notes" v-model="form.notes" rows="3" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none resize-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)" />
        </div>
      </div>

      <!-- Email Tab -->
      <div v-if="activeTab === 'Email'" class="px-6 py-5">
        <EmailComposer :lead="lead" />
      </div>

      <!-- Activity Tab -->
      <div v-if="activeTab === 'Activity'" class="px-6 py-5 space-y-6">
        <!-- Sales Calls -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-slate-300 uppercase tracking-wide">Sales Calls</h4>
            <NuxtLink to="/sales-calls" class="text-xs text-cyan-400 hover:text-cyan-300">View all →</NuxtLink>
          </div>
          <div v-if="loadingActivity" class="text-slate-500 text-sm">Loading…</div>
          <div v-else-if="salesCalls.length === 0" class="text-slate-500 text-sm">No sales calls logged.</div>
          <div v-else class="space-y-2">
            <div v-for="c in salesCalls" :key="c.id" class="bg-[#070c18] rounded-lg p-3 text-sm border border-slate-700/40">
              <div class="flex items-center gap-2 flex-wrap">
                <span :class="outcomeClass(c.outcome)" class="px-2 py-0.5 rounded-full text-xs">{{ c.outcome }}</span>
                <span class="text-slate-400">{{ formatDate(c.scheduled_at) }} · {{ c.duration_minutes }}min</span>
              </div>
              <div v-if="c.next_step" class="text-cyan-400 text-xs mt-1">→ {{ c.next_step }}</div>
              <div v-if="c.notes" class="text-slate-500 text-xs mt-1 line-clamp-2">{{ c.notes }}</div>
            </div>
          </div>
        </div>

        <!-- Appointments -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-slate-300 uppercase tracking-wide">Appointments</h4>
            <NuxtLink to="/appointments" class="text-xs text-cyan-400 hover:text-cyan-300">View all →</NuxtLink>
          </div>
          <div v-if="loadingActivity" class="text-slate-500 text-sm">Loading…</div>
          <div v-else-if="appointments.length === 0" class="text-slate-500 text-sm">No appointments scheduled.</div>
          <div v-else class="space-y-2">
            <div v-for="a in appointments" :key="a.id" class="bg-[#070c18] rounded-lg p-3 text-sm border border-slate-700/40">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-white font-medium">{{ a.title }}</span>
                <span :class="apptStatusClass(a.status)" class="px-2 py-0.5 rounded-full text-xs">{{ a.status }}</span>
              </div>
              <div class="text-slate-400 text-xs mt-1">{{ formatDate(a.scheduled_at) }} · {{ a.duration_minutes }}min</div>
              <div v-if="a.location" class="text-cyan-400 text-xs mt-1">📍 {{ a.location }}</div>
            </div>
          </div>
        </div>

        <!-- Contracts -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-slate-300 uppercase tracking-wide">Contracts</h4>
            <NuxtLink to="/contracts" class="text-xs text-cyan-400 hover:text-cyan-300">View all →</NuxtLink>
          </div>
          <div v-if="loadingActivity" class="text-slate-500 text-sm">Loading…</div>
          <div v-else-if="contracts.length === 0" class="text-slate-500 text-sm">No contracts on file.</div>
          <div v-else class="space-y-2">
            <div v-for="c in contracts" :key="c.id" class="bg-[#070c18] rounded-lg p-3 text-sm border border-slate-700/40">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-white font-medium">{{ c.service }}</span>
                <span class="text-green-400 font-semibold">{{ formatCurrency(c.value) }}</span>
              </div>
              <div class="flex gap-3 mt-1 text-xs flex-wrap">
                <span v-if="c.signed_at" class="text-cyan-400">✍ Signed {{ formatDate(c.signed_at) }}</span>
                <span v-else class="text-slate-500">Not signed</span>
                <span v-if="c.paid_at" class="text-green-400">💳 Paid {{ formatDate(c.paid_at) }}</span>
                <span v-else class="text-slate-500">Not paid</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer (Details tab only) -->
      <div v-if="activeTab === 'Details'" class="px-6 pb-5 flex justify-between items-center" style="border-top:1px solid rgba(148,163,184,0.08);padding-top:1.25rem">
        <button
          class="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          :disabled="scoringLead"
          @click="scoreThisLead"
        >
          {{ scoringLead ? '⏳ Scoring...' : '✨ AI Score This Lead' }}
        </button>
        <div class="flex gap-2">
          <button class="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-slate-100 transition-colors" style="border:1px solid rgba(148,163,184,0.2)" @click="$emit('close')">Cancel</button>
          <button class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition" @click="save">Save Changes</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLeadsStore } from '~/stores/leads'
import { useAI } from '~/composables/useAI'
import type { Lead, LeadStage } from '~/types'

const props = defineProps<{ lead: Lead }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const leadsStore = useLeadsStore()
const { scoreLead } = useAI()

const tabs = ['Details', 'Email', 'Activity'] as const
type Tab = typeof tabs[number]
const activeTab = ref<Tab>('Details')

const STAGES: LeadStage[] = [
  'New Lead', 'Contacted', 'Booked Consultation', 'Sales Call', 'Qualified',
  'Proposal Sent', 'Contract Signed', 'Contract Paid',
  'Purchased Course', 'Became Consulting Client',
  'Not a Fit', 'Lost/No Response',
]

const form = reactive({
  stage: props.lead.stage,
  revenue: props.lead.revenue,
  notes: props.lead.notes || '',
  assignee: props.lead.assignee || '',
})

const aiScore = ref<Awaited<ReturnType<typeof scoreLead>>>(null)
const scoringLead = ref(false)

// Activity tab
const loadingActivity = ref(false)
const salesCalls = ref<any[]>([])
const appointments = ref<any[]>([])
const contracts = ref<any[]>([])

watch(activeTab, async (tab) => {
  if (tab !== 'Activity' || salesCalls.value.length || appointments.value.length || contracts.value.length) return
  loadingActivity.value = true
  const [sc, ap, co] = await Promise.all([
    $fetch<any>(`/api/sales-calls?lead_id=${props.lead.id}`),
    $fetch<any>(`/api/appointments?lead_id=${props.lead.id}`),
    $fetch<any>(`/api/contracts?lead_id=${props.lead.id}`),
  ])
  salesCalls.value = sc.data ?? []
  appointments.value = ap.data ?? []
  contracts.value = co.data ?? []
  loadingActivity.value = false
})

function outcomeClass(o: string) {
  return ({
    completed: 'bg-green-900/40 text-green-400',
    scheduled: 'bg-cyan-900/40 text-cyan-400',
    no_show: 'bg-red-900/40 text-red-400',
    rescheduled: 'bg-yellow-900/40 text-yellow-400',
    cancelled: 'bg-slate-700 text-slate-400',
  } as Record<string, string>)[o] ?? 'bg-slate-700 text-slate-400'
}

function apptStatusClass(s: string) {
  return ({
    scheduled: 'bg-cyan-900/40 text-cyan-400',
    completed: 'bg-green-900/40 text-green-400',
    cancelled: 'bg-red-900/40 text-red-400',
    no_show: 'bg-orange-900/40 text-orange-400',
  } as Record<string, string>)[s] ?? 'bg-slate-700 text-slate-400'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v)
}

async function scoreThisLead() {
  scoringLead.value = true
  aiScore.value = await scoreLead(props.lead)
  scoringLead.value = false
}

async function save() {
  await leadsStore.updateLead(props.lead.id, form)
  emit('saved')
}
</script>
