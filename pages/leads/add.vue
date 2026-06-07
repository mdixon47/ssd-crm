<template>
  <div class="p-6 max-w-3xl mx-auto">
    <div class="flex items-center gap-4 mb-6">
      <NuxtLink to="/leads" class="text-primary hover:underline text-sm">← Back to Pipeline</NuxtLink>
      <h1 class="text-2xl font-bold text-primary">Add New Lead</h1>
    </div>

    <form class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6" @submit.prevent="submit">
      <section>
        <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Contact Information</h2>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="block text-xs font-semibold text-slate-500 mb-1.5">First Name *</label><input v-model="form.fname" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" /></div>
          <div><label class="block text-xs font-semibold text-slate-500 mb-1.5">Last Name *</label><input v-model="form.lname" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" /></div>
          <div><label class="block text-xs font-semibold text-slate-500 mb-1.5">Email *</label><input v-model="form.email" type="email" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" /></div>
          <div><label class="block text-xs font-semibold text-slate-500 mb-1.5">Phone</label><input v-model="form.phone" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" /></div>
          <div><label class="block text-xs font-semibold text-slate-500 mb-1.5">Organization *</label><input v-model="form.org" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" /></div>
          <div><label class="block text-xs font-semibold text-slate-500 mb-1.5">Job Title</label><input v-model="form.title" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" /></div>
        </div>
      </section>

      <section>
        <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Service Interest</h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1.5">Primary Interest *</label>
            <select v-model="form.interest" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50">
              <option value="">Select...</option>
              <option>Free Grant Writing Course</option>
              <option>Grant Writing 101 (Paid)</option>
              <option>Grants Management Consulting</option>
              <option>Behavioral Health Consulting</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1.5">Stage *</label>
            <select v-model="form.stage" required class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50">
              <option v-for="s in STAGES" :key="s">{{ s }}</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Ad Tracking Data</h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1.5">Traffic Source</label>
            <select v-model="form.source" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50">
              <option value="">Unknown / Direct</option>
              <option value="google">Google Ads</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="email">Email</option>
              <option value="organic">Organic</option>
            </select>
          </div>
          <div><label class="block text-xs font-semibold text-slate-500 mb-1.5">Campaign</label><input v-model="form.campaign" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" /></div>
          <div><label class="block text-xs font-semibold text-slate-500 mb-1.5">Keyword (utm_term)</label><input v-model="form.keyword" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" /></div>
          <div><label class="block text-xs font-semibold text-slate-500 mb-1.5">Click ID (GCLID / FBCLID)</label><input v-model="form.gclid" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" /></div>
          <div><label class="block text-xs font-semibold text-slate-500 mb-1.5">Landing Page</label><input v-model="form.landing" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" /></div>
          <div><label class="block text-xs font-semibold text-slate-500 mb-1.5">Revenue ($)</label><input v-model.number="form.revenue" type="number" min="0" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" /></div>
        </div>
        <div class="mt-4">
          <label class="block text-xs font-semibold text-slate-500 mb-1.5">Notes</label>
          <textarea v-model="form.notes" rows="3" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none" />
        </div>
      </section>

      <div v-if="aiScore" class="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div class="text-sm font-bold text-primary mb-1">✨ AI Score: {{ aiScore.score }}/10 · Tier {{ aiScore.tier }}</div>
        <p class="text-sm text-slate-600">{{ aiScore.reasoning }}</p>
        <p class="text-sm font-medium text-primary mt-1">→ {{ aiScore.recommended_next_step }}</p>
      </div>

      <div class="flex justify-between items-center pt-2">
        <div v-if="error" class="text-red-600 text-sm">{{ error }}</div>
        <div class="flex gap-3 ml-auto">
          <NuxtLink to="/leads" class="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:border-slate-300">Cancel</NuxtLink>
          <button type="submit" :disabled="saving" class="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-light transition disabled:opacity-50">
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
