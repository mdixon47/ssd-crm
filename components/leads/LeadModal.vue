<template>
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
        <h3 class="font-bold text-primary text-lg">{{ lead.fname }} {{ lead.lname }}</h3>
        <button class="text-slate-400 hover:text-slate-700 text-2xl leading-none" @click="$emit('close')">×</button>
      </div>

      <div class="px-6 py-5 space-y-5">
        <!-- Contact info -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div class="text-xs font-semibold text-slate-400 uppercase mb-1">Contact</div>
            <p class="text-slate-700">{{ lead.email }}</p>
            <p v-if="lead.phone" class="text-slate-600">{{ lead.phone }}</p>
            <p v-if="lead.title" class="text-slate-600">{{ lead.title }}</p>
          </div>
          <div>
            <div class="text-xs font-semibold text-slate-400 uppercase mb-1">Ad Tracking</div>
            <p class="font-mono text-xs text-slate-500 leading-relaxed">
              Source: {{ lead.source || '—' }}<br>
              Campaign: {{ lead.campaign || '—' }}<br>
              Keyword: {{ lead.keyword || '—' }}<br>
              GCLID: {{ lead.gclid ? lead.gclid.slice(0, 12) + '...' : '—' }}
            </p>
          </div>
        </div>

        <!-- AI Score (if available) -->
        <div v-if="aiScore" class="bg-slate-50 rounded-xl p-4 border border-slate-200">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-slate-500 uppercase">AI Lead Score</div>
            <div
              class="text-lg font-black"
              :class="aiScore.score >= 7 ? 'text-green-600' : aiScore.score >= 4 ? 'text-amber-600' : 'text-red-600'"
            >
              {{ aiScore.score }}/10 · Tier {{ aiScore.tier }}
            </div>
          </div>
          <p class="text-sm text-slate-600 mb-2">{{ aiScore.reasoning }}</p>
          <p class="text-sm font-medium text-primary">→ {{ aiScore.recommended_next_step }}</p>
          <p class="text-xs text-slate-500 mt-1">Est. value: {{ aiScore.estimated_deal_value }}</p>
        </div>

        <!-- Update Stage -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Stage</label>
            <select v-model="form.stage" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50">
              <option v-for="s in STAGES" :key="s">{{ s }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Revenue ($)</label>
            <input v-model.number="form.revenue" type="number" min="0" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50">
          </div>
        </div>

        <div>
          <label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Notes</label>
          <textarea v-model="form.notes" rows="3" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none" />
        </div>
      </div>

      <div class="px-6 pb-5 flex justify-between items-center">
        <button
          class="text-sm text-primary hover:underline"
          :disabled="scoringLead"
          @click="scoreThisLead"
        >
          {{ scoringLead ? '⏳ Scoring...' : '✨ AI Score This Lead' }}
        </button>
        <div class="flex gap-2">
          <button class="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:border-slate-300 transition" @click="$emit('close')">Cancel</button>
          <button class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition" @click="save">Save Changes</button>
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
