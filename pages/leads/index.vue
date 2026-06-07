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
import LeadModal from '~/components/leads/LeadModal.vue'
import type { Lead } from '~/types'

const leadsStore = useLeadsStore()
const view = ref<'pipeline' | 'list'>('pipeline')
const selectedLead = ref<Lead | null>(null)

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
