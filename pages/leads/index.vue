<template>
  <div class="p-6 max-w-full mx-auto">
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-2xl font-bold text-cyan-400">Leads & Pipeline</h1>
      <div class="flex gap-2">
        <button
          class="text-sm px-3 py-1.5 rounded-lg transition-colors text-slate-300 hover:text-slate-100"
          style="border:1px solid rgba(148,163,184,0.2)"
          @click="view = view === 'pipeline' ? 'list' : 'pipeline'"
        >
          {{ view === 'pipeline' ? '≡ List View' : '⊞ Pipeline View' }}
        </button>
        <NuxtLink to="/leads/add" class="bg-cyan-600 hover:bg-cyan-500 text-white text-sm px-4 py-1.5 rounded-lg transition font-medium">
          + Add Lead
        </NuxtLink>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-5 flex-wrap">
      <select v-model="leadsStore.filterCampaign" class="rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)">
        <option value="">All Campaigns</option>
        <optgroup label="Google Ads">
          <option>Free Grant Writing Course</option>
          <option>Grant Writing 101</option>
          <option>Grants Management Consulting</option>
          <option>Behavioral Health Consulting</option>
        </optgroup>
        <optgroup label="Social Media">
          <option>FB — Nonprofit Audience</option>
          <option>FB — Lookalike Grant Writers</option>
          <option>LI — Nonprofit Leaders</option>
          <option>LI — BH Agency Leaders</option>
        </optgroup>
      </select>
      <select v-model="leadsStore.filterStage" class="rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)">
        <option value="">All Stages</option>
        <option v-for="s in leadsStore.STAGES" :key="s">{{ s }}</option>
      </select>
      <input
        v-model="leadsStore.filterSearch"
        type="text"
        placeholder="Search name or org..."
        class="rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 w-52 focus:outline-none"
        style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
      >
      <div class="ml-auto text-sm text-slate-500 self-center">
        {{ leadsStore.filteredLeads.length }} leads
      </div>
    </div>

    <!-- AI Email Strategist -->
    <div class="rounded-xl p-5 mb-5" style="background:#0d1628;border:1px solid rgba(16,185,129,0.2)">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-lg">✉️</span>
          <h2 class="font-semibold text-slate-100">AI Email Strategist</h2>
          <span v-if="strategy" class="text-xs text-slate-500">{{ strategy.suggestions.length }} suggested · {{ strategy.skipped.length }} skipped</span>
        </div>
        <div class="flex items-center gap-2">
          <input
            v-model="strategyFocus"
            type="text"
            placeholder="Focus (optional) — e.g. proposal follow-ups"
            class="hidden md:block rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none w-64"
            style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
          >
          <button
            class="text-xs font-semibold py-1.5 px-3 rounded-md transition-colors disabled:opacity-50 text-emerald-300"
            style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3)"
            :disabled="strategyLoading"
            @click="loadStrategy"
          >
            {{ strategyLoading ? '⏳ Planning...' : strategy ? '↻ Re-run' : 'Plan outreach' }}
          </button>
        </div>
      </div>

      <p v-if="!strategy && !strategyLoading && !strategyError" class="text-sm text-slate-500">
        Identify priority leads to email next — dormant qualified leads, proposal follow-ups, stage nudges — with personalized drafts.
      </p>
      <p v-if="strategyError" class="text-sm text-red-400">{{ strategyError }}</p>

      <div v-if="strategy" class="space-y-3">
        <p class="text-sm text-slate-300 leading-relaxed">{{ strategy.summary }}</p>

        <div v-if="strategy.segment_summary.length" class="flex flex-wrap gap-1.5">
          <span v-for="(s, i) in strategy.segment_summary" :key="i" class="text-xs text-slate-300 px-2.5 py-1 rounded-full" style="background:rgba(148,163,184,0.08);border:1px solid rgba(148,163,184,0.1)">{{ s }}</span>
        </div>

        <ul class="space-y-2">
          <li v-for="(s, i) in strategy.suggestions" :key="i" class="rounded-lg p-3" style="background:#080e1c;border:1px solid rgba(148,163,184,0.08)">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <span :class="priorityBadgeClass(s.priority)" class="text-xs px-2 py-0.5 rounded-full font-semibold">{{ s.priority }}</span>
                  <span class="font-medium text-slate-100">{{ s.lead_name }}</span>
                  <span v-if="s.lead_org" class="text-xs text-slate-500">· {{ s.lead_org }}</span>
                  <span class="text-xs text-slate-600">· {{ s.current_stage }}</span>
                </div>
                <div class="text-xs text-slate-500 mb-2">{{ s.reason }}</div>
                <div class="text-sm font-medium text-slate-200">{{ s.subject }}</div>

                <div v-if="expandedSuggestion === i" class="mt-2 space-y-2">
                  <input
                    v-model="s.subject"
                    type="text"
                    placeholder="Subject"
                    class="w-full rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
                    style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
                  >
                  <textarea
                    v-model="s.body"
                    rows="8"
                    placeholder="Email body"
                    class="w-full rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none leading-relaxed"
                    style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
                  />
                  <div class="flex items-center gap-2 flex-wrap">
                    <button
                      class="text-xs font-semibold py-1.5 px-3 rounded-md transition-colors disabled:opacity-50 text-emerald-300"
                      style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3)"
                      :disabled="!s.lead_id || !s.subject || !s.body || sendState[i] === 'sending' || sendState[i] === 'sent'"
                      @click="sendDraft(s, i)"
                    >
                      {{ sendState[i] === 'sending' ? '⏳ Sending…' : sendState[i] === 'sent' ? '✓ Sent' : `Send to ${s.lead_email}` }}
                    </button>
                    <span v-if="!s.lead_id" class="text-xs text-amber-400">No matched CRM lead — open the lead to send manually.</span>
                    <span v-if="sendState[i] === 'error'" class="text-xs text-red-400">{{ sendErrors[i] }}</span>
                  </div>
                </div>

                <button class="text-xs text-cyan-400 hover:text-cyan-300 mt-1 transition-colors" @click="expandedSuggestion = expandedSuggestion === i ? null : i">
                  {{ expandedSuggestion === i ? '↑ Hide draft' : '↓ Edit & send' }}
                </button>
              </div>
              <button
                v-if="s.lead_id"
                class="text-xs px-3 py-1.5 rounded-lg text-cyan-300 hover:text-cyan-200 flex-shrink-0 transition-colors"
                style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.2)"
                @click="openLead(s.lead_id!)"
              >
                Open
              </button>
            </div>
          </li>
        </ul>

        <details v-if="strategy.skipped.length" class="text-xs text-slate-500">
          <summary class="cursor-pointer hover:text-slate-300">{{ strategy.skipped.length }} skipped</summary>
          <ul class="mt-2 space-y-1 pl-3">
            <li v-for="(sk, i) in strategy.skipped" :key="i">• <span class="text-slate-300">{{ sk.lead_name }}</span> — {{ sk.reason }}</li>
          </ul>
        </details>

        <p class="text-xs text-slate-600 italic">Drafts are suggestions — edit inline and send via Resend, or open a lead to send manually.</p>
      </div>
    </div>

    <!-- Pipeline View -->
    <div v-if="view === 'pipeline'" class="flex gap-3 overflow-x-auto pb-4">
      <div
        v-for="stage in leadsStore.STAGES"
        :key="stage"
        class="min-w-[200px] flex-none"
      >
        <div
          class="text-white px-3 py-2 rounded-t-lg text-xs font-bold flex justify-between items-center"
          :style="{ background: stageColor(stage) }"
        >
          <span>{{ stage }}</span>
          <span class="bg-white/20 px-2 py-0.5 rounded-full">{{ leadsStore.leadsByStage[stage]?.length ?? 0 }}</span>
        </div>
        <div class="rounded-b-lg p-2 min-h-24 flex flex-col gap-2" style="background:rgba(13,22,40,0.8)">
          <div
            v-for="lead in leadsStore.leadsByStage[stage]"
            :key="lead.id"
            class="rounded-lg p-3 cursor-pointer border-l-4 transition-all hover:translate-x-0.5"
            style="background:#111d35"
            :style="{ borderLeftColor: lead.source === 'facebook' ? '#1877F2' : lead.source === 'linkedin' ? '#0A66C2' : lead.source === 'instagram' ? '#E1306C' : '#06b6d4' }"
            @click="openLead(lead.id)"
          >
            <div class="font-semibold text-sm text-slate-100">{{ lead.fname }} {{ lead.lname }}</div>
            <div class="text-xs text-slate-500 mt-0.5">{{ lead.org }}</div>
            <div v-if="lead.campaign" class="text-xs text-amber-400 font-medium mt-1.5">{{ lead.campaign }}</div>
            <div v-if="lead.revenue > 0" class="text-xs text-emerald-400 font-bold mt-1">${{ lead.revenue.toLocaleString() }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead style="background:#080e1c;border-bottom:1px solid rgba(148,163,184,0.08)">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Organization</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Campaign</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Stage</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Revenue</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fit</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700/30">
            <tr
              v-for="lead in leadsStore.filteredLeads"
              :key="lead.id"
              class="hover:bg-cyan-500/5 transition-colors cursor-pointer"
              @click="openLead(lead.id)"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-slate-100">{{ lead.fname }} {{ lead.lname }}</div>
                <div class="text-xs text-slate-500">{{ lead.email }}</div>
              </td>
              <td class="px-4 py-3 text-slate-300">{{ lead.org }}</td>
              <td class="px-4 py-3">
                <span v-if="lead.campaign" class="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">{{ lead.campaign }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs px-2 py-1 rounded-full font-medium" :class="stageClass(lead.stage)">{{ lead.stage }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <span v-if="lead.revenue > 0" class="font-bold text-emerald-400">${{ lead.revenue.toLocaleString() }}</span>
                <span v-else class="text-slate-600">—</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="text-xs px-2 py-0.5 rounded-full font-semibold"
                  :class="lead.qualified === 'yes' ? 'bg-emerald-500/15 text-emerald-400' : lead.qualified === 'no' ? 'bg-red-500/15 text-red-400' : 'bg-slate-500/15 text-slate-400'"
                >
                  {{ lead.qualified === 'yes' ? '✓ Fit' : lead.qualified === 'no' ? '✗ No Fit' : '?' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button class="text-xs text-cyan-400 hover:underline">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Lead Modal -->
    <LeadModal v-if="selectedLead" :lead="selectedLead" @close="selectedLead = null" @saved="onLeadSaved" />
  </div>
</template>

<script setup lang="ts">
import { useLeadsStore } from '~/stores/leads'
import { useAI } from '~/composables/useAI'
import LeadModal from '~/components/leads/LeadModal.vue'
import type { Lead, EmailStrategyOutput, EmailOutreachSuggestion } from '~/types'

const leadsStore = useLeadsStore()
const view = ref<'pipeline' | 'list'>('pipeline')
const selectedLead = ref<Lead | null>(null)

// AI Email Strategist
const { runEmailStrategy, error: aiError } = useAI()
const strategy = ref<EmailStrategyOutput | null>(null)
const strategyLoading = ref(false)
const strategyError = ref<string | null>(null)
const strategyFocus = ref('')
const expandedSuggestion = ref<number | null>(null)
const sendState = ref<Record<number, 'sending' | 'sent' | 'error'>>({})
const sendErrors = ref<Record<number, string>>({})

async function loadStrategy() {
  strategyLoading.value = true
  strategyError.value = null
  expandedSuggestion.value = null
  sendState.value = {}
  sendErrors.value = {}
  try {
    const result = await runEmailStrategy({ focus: strategyFocus.value || undefined })
    if (result) strategy.value = result
    else strategyError.value = aiError.value ?? 'Strategy run failed'
  }
  finally {
    strategyLoading.value = false
  }
}

async function sendDraft(s: EmailOutreachSuggestion, i: number) {
  if (!s.lead_id) return
  sendState.value[i] = 'sending'
  try {
    await $fetch('/api/email/send', {
      method: 'POST',
      body: { leadId: s.lead_id, to: s.lead_email, subject: s.subject, body: s.body },
    })
    sendState.value[i] = 'sent'
  }
  catch (e) {
    sendState.value[i] = 'error'
    sendErrors.value[i] = (e as { data?: { message?: string } })?.data?.message
      ?? (e instanceof Error ? e.message : 'Send failed')
  }
}

function priorityBadgeClass(p: 'high' | 'medium' | 'low') {
  return p === 'high' ? 'bg-red-500/15 text-red-400' : p === 'medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400'
}

onMounted(() => { leadsStore.fetchLeads() })

function openLead(id: string) {
  selectedLead.value = leadsStore.getById(id)
}

function onLeadSaved() {
  selectedLead.value = null
  leadsStore.fetchLeads()
}

function stageColor(stage: string) {
  const map: Record<string, string> = {
    'New Lead': '#0e4a8a', 'Contacted': '#0d5f9e', 'Booked Consultation': '#7c4400',
    'Qualified': '#7c5a00', 'Proposal Sent': '#7c3500', 'Purchased Course': '#065c2e',
    'Became Consulting Client': '#044020', 'Not a Fit': '#5c1a1a', 'Lost/No Response': '#2d3748',
  }
  return map[stage] || '#0e4a8a'
}

function stageClass(stage: string) {
  const map: Record<string, string> = {
    'New Lead': 'bg-blue-500/15 text-blue-400', 'Contacted': 'bg-blue-500/15 text-blue-400',
    'Booked Consultation': 'bg-amber-500/15 text-amber-400', 'Qualified': 'bg-amber-500/15 text-amber-400',
    'Proposal Sent': 'bg-orange-500/15 text-orange-400', 'Purchased Course': 'bg-emerald-500/15 text-emerald-400',
    'Became Consulting Client': 'bg-emerald-500/15 text-emerald-400', 'Not a Fit': 'bg-red-500/15 text-red-400',
    'Lost/No Response': 'bg-slate-500/15 text-slate-400',
  }
  return map[stage] || 'bg-slate-500/15 text-slate-400'
}
</script>
