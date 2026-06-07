<template>
  <div class="p-6 max-w-full mx-auto">
    <div class="flex items-center justify-between mb-5">
      <h1 class="text-2xl font-bold text-primary">Leads & Pipeline</h1>
      <div class="flex gap-2">
        <button
          class="text-sm px-3 py-1.5 border border-slate-200 rounded-lg hover:border-primary/40 transition"
          @click="view = view === 'pipeline' ? 'list' : 'pipeline'"
        >
          {{ view === 'pipeline' ? '≡ List View' : '⊞ Pipeline View' }}
        </button>
        <NuxtLink to="/leads/add" class="bg-primary text-white text-sm px-4 py-1.5 rounded-lg hover:bg-primary-light transition font-medium">
          + Add Lead
        </NuxtLink>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 mb-5 flex-wrap">
      <select v-model="leadsStore.filterCampaign" class="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
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
      <select v-model="leadsStore.filterStage" class="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
        <option value="">All Stages</option>
        <option v-for="s in leadsStore.STAGES" :key="s">{{ s }}</option>
      </select>
      <input
        v-model="leadsStore.filterSearch"
        type="text"
        placeholder="Search name or org..."
        class="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white w-52 focus:outline-none focus:border-primary/50"
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
          <span class="bg-white/25 px-2 py-0.5 rounded-full">{{ leadsStore.leadsByStage[stage]?.length ?? 0 }}</span>
        </div>
        <div class="bg-slate-100 rounded-b-lg p-2 min-h-24 flex flex-col gap-2">
          <div
            v-for="lead in leadsStore.leadsByStage[stage]"
            :key="lead.id"
            class="bg-white rounded-lg p-3 shadow-sm cursor-pointer border-l-4 hover:shadow-md transition-shadow"
            :style="{ borderLeftColor: lead.source === 'facebook' ? '#1877F2' : lead.source === 'linkedin' ? '#0A66C2' : lead.source === 'instagram' ? '#E1306C' : '#2a5298' }"
            @click="openLead(lead.id)"
          >
            <div class="font-semibold text-sm text-slate-800">{{ lead.fname }} {{ lead.lname }}</div>
            <div class="text-xs text-slate-500 mt-0.5">{{ lead.org }}</div>
            <div v-if="lead.campaign" class="text-xs text-amber-600 font-medium mt-1.5">{{ lead.campaign }}</div>
            <div v-if="lead.revenue > 0" class="text-xs text-green-600 font-bold mt-1">${{ lead.revenue.toLocaleString() }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
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
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="lead in leadsStore.filteredLeads"
              :key="lead.id"
              class="hover:bg-slate-50/50 transition-colors cursor-pointer"
              @click="openLead(lead.id)"
            >
              <td class="px-4 py-3">
                <div class="font-medium text-slate-800">{{ lead.fname }} {{ lead.lname }}</div>
                <div class="text-xs text-slate-400">{{ lead.email }}</div>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ lead.org }}</td>
              <td class="px-4 py-3">
                <span v-if="lead.campaign" class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{{ lead.campaign }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs px-2 py-1 rounded-full font-medium" :class="stageClass(lead.stage)">{{ lead.stage }}</span>
              </td>
              <td class="px-4 py-3 text-right">
                <span v-if="lead.revenue > 0" class="font-bold text-green-600">${{ lead.revenue.toLocaleString() }}</span>
                <span v-else class="text-slate-300">—</span>
              </td>
              <td class="px-4 py-3 text-center">
                <span
                  class="text-xs px-2 py-0.5 rounded-full font-semibold"
                  :class="lead.qualified === 'yes' ? 'bg-green-100 text-green-700' : lead.qualified === 'no' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'"
                >
                  {{ lead.qualified === 'yes' ? '✓ Fit' : lead.qualified === 'no' ? '✗ No Fit' : '?' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button class="text-xs text-primary hover:underline">View</button>
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
    'New Lead': '#2a5298', 'Contacted': '#3a7bd5', 'Booked Consultation': '#b87a10',
    'Qualified': '#e8a020', 'Proposal Sent': '#c45c0a', 'Purchased Course': '#166937',
    'Became Consulting Client': '#0d5228', 'Not a Fit': '#8b1a1a', 'Lost/No Response': '#4a5568',
  }
  return map[stage] || '#2a5298'
}

function stageClass(stage: string) {
  const map: Record<string, string> = {
    'New Lead': 'bg-blue-100 text-blue-700', 'Contacted': 'bg-blue-100 text-blue-700',
    'Booked Consultation': 'bg-amber-100 text-amber-700', 'Qualified': 'bg-amber-100 text-amber-700',
    'Proposal Sent': 'bg-orange-100 text-orange-700', 'Purchased Course': 'bg-green-100 text-green-700',
    'Became Consulting Client': 'bg-green-100 text-green-800', 'Not a Fit': 'bg-red-100 text-red-700',
    'Lost/No Response': 'bg-slate-100 text-slate-500',
  }
  return map[stage] || 'bg-slate-100 text-slate-600'
}
</script>
