<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center gap-4 mb-6">
      <NuxtLink to="/leads" class="text-cyan-400 hover:text-cyan-300 text-sm transition-colors">← Back to Pipeline</NuxtLink>
      <h1 class="text-2xl font-bold text-cyan-400">Add New Lead</h1>
    </div>

    <form class="rounded-xl p-6 space-y-6" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)" @submit.prevent="submit">
      <section>
        <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4" style="border-bottom:1px solid rgba(148,163,184,0.08);padding-bottom:0.75rem">Contact Information</h2>
        <div class="grid grid-cols-2 gap-4">
          <div><label for="lead-fname" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">First Name *</label><input id="lead-fname" v-model="form.fname" required class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
          <div><label for="lead-lname" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Last Name *</label><input id="lead-lname" v-model="form.lname" required class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
          <div><label for="lead-email" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Email *</label><input id="lead-email" v-model="form.email" type="email" required class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
          <div><label for="lead-phone" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Phone</label><input id="lead-phone" v-model="form.phone" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
          <div><label for="lead-org" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Organization *</label><input id="lead-org" v-model="form.org" required class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
          <div><label for="lead-title" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Job Title</label><input id="lead-title" v-model="form.title" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
        </div>
      </section>

      <section>
        <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4" style="border-bottom:1px solid rgba(148,163,184,0.08);padding-bottom:0.75rem">Service Interest</h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="lead-interest" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Primary Interest *</label>
            <select id="lead-interest" v-model="form.interest" required class="w-full rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)">
              <option value="">Select...</option>
              <option>Free Grant Writing Course</option>
              <option>Grant Writing 101 (Paid)</option>
              <option>Grants Management Consulting</option>
              <option>Behavioral Health Consulting</option>
            </select>
          </div>
          <div>
            <label for="lead-stage" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Stage *</label>
            <select id="lead-stage" v-model="form.stage" required class="w-full rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)">
              <option v-for="s in STAGES" :key="s">{{ s }}</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4" style="border-bottom:1px solid rgba(148,163,184,0.08);padding-bottom:0.75rem">Ad Tracking Data</h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="lead-source" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Traffic Source</label>
            <select id="lead-source" v-model="form.source" class="w-full rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)">
              <option value="">Unknown / Direct</option>
              <option value="google">Google Ads</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="email">Email</option>
              <option value="organic">Organic</option>
            </select>
          </div>
          <div><label for="lead-campaign" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Campaign</label><input id="lead-campaign" v-model="form.campaign" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
          <div><label for="lead-keyword" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Keyword (utm_term)</label><input id="lead-keyword" v-model="form.keyword" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
          <div><label for="lead-gclid" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Click ID (GCLID / FBCLID)</label><input id="lead-gclid" v-model="form.gclid" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
          <div><label for="lead-landing" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Landing Page</label><input id="lead-landing" v-model="form.landing" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
          <div><label for="lead-revenue" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Revenue ($)</label><input id="lead-revenue" v-model.number="form.revenue" type="number" min="0" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
        </div>
        <div class="mt-4">
          <label for="lead-notes" class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Notes</label>
          <textarea id="lead-notes" v-model="form.notes" rows="3" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none resize-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)" />
        </div>
      </section>

      <div v-if="aiScore" class="rounded-xl p-4" style="background:rgba(6,182,212,0.05);border:1px solid rgba(6,182,212,0.2)">
        <div class="text-sm font-bold text-cyan-400 mb-1">✨ AI Score: {{ aiScore.score }}/10 · Tier {{ aiScore.tier }}</div>
        <p class="text-sm text-slate-400">{{ aiScore.reasoning }}</p>
        <p class="text-sm font-medium text-cyan-400 mt-1">→ {{ aiScore.recommended_next_step }}</p>
      </div>

      <div class="flex justify-between items-center pt-2">
        <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
        <div class="flex gap-3 ml-auto">
          <NuxtLink to="/leads" class="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-slate-100 transition-colors" style="border:1px solid rgba(148,163,184,0.2)">Cancel</NuxtLink>
          <button type="submit" :disabled="saving" class="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50">
            {{ saving ? 'Saving...' : 'Save Lead' }}
          </button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useLeadsStore } from '~/stores/leads'
import type { LeadStage } from '~/types'

const router = useRouter()
const leadsStore = useLeadsStore()
const saving = ref(false)
const error = ref('')
const aiScore = ref<Record<string, unknown> | null>(null)

const STAGES: LeadStage[] = ['New Lead','Contacted','Booked Consultation','Qualified','Proposal Sent','Purchased Course','Became Consulting Client','Not a Fit','Lost/No Response']

const form = reactive({
  fname: '', lname: '', email: '', phone: '', org: '', title: '',
  interest: '', stage: 'New Lead' as LeadStage, source: '', campaign: '',
  keyword: '', gclid: '', landing: '', revenue: 0, notes: '', qualified: '',
  lead_date: new Date().toISOString().slice(0, 10),
})

async function submit() {
  saving.value = true
  error.value = ''
  try {
    const result = await leadsStore.addLead(form)
    if (result) {
      await router.push('/leads')
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to save lead'
  } finally {
    saving.value = false
  }
}
</script>
