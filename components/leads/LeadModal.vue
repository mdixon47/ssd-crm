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

        <div>
          <label for="modal-notes" class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Notes</label>
          <textarea id="modal-notes" v-model="form.notes" rows="3" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none resize-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)" />
        </div>
      </div>

      <!-- Email Tab -->
      <div v-if="activeTab === 'Email'" class="px-6 py-5">
        <EmailComposer :lead="lead" />
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

const tabs = ['Details', 'Email'] as const
type Tab = typeof tabs[number]
const activeTab = ref<Tab>('Details')

const STAGES: LeadStage[] = [
  'New Lead', 'Contacted', 'Booked Consultation', 'Qualified',
  'Proposal Sent', 'Purchased Course', 'Became Consulting Client',
  'Not a Fit', 'Lost/No Response',
]

const form = reactive({
  stage: props.lead.stage,
  revenue: props.lead.revenue,
  notes: props.lead.notes || '',
})

const aiScore = ref<Awaited<ReturnType<typeof scoreLead>>>(null)
const scoringLead = ref(false)

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
