import { defineStore } from 'pinia'
import type { Lead, LeadInsert, LeadUpdate, LeadStage } from '~/types'

export const useLeadsStore = defineStore('leads', () => {
  const leads = ref<Lead[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Filters ──────────────────────────────────────────────
  const filterCampaign = ref('')
  const filterStage = ref('')
  const filterSearch = ref('')

  const filteredLeads = computed(() => {
    return leads.value.filter((l) => {
      if (filterCampaign.value && l.campaign !== filterCampaign.value) return false
      if (filterStage.value && l.stage !== filterStage.value) return false
      if (filterSearch.value) {
        const q = filterSearch.value.toLowerCase()
        const match = `${l.fname} ${l.lname} ${l.org}`.toLowerCase()
        if (!match.includes(q)) return false
      }
      return true
    })
  })

  // ── Stage grouping ────────────────────────────────────────
  const STAGES: LeadStage[] = [
    'New Lead', 'Contacted', 'Booked Consultation', 'Qualified',
    'Proposal Sent', 'Purchased Course', 'Became Consulting Client',
    'Not a Fit', 'Lost/No Response',
  ]

  const leadsByStage = computed(() => {
    const map: Record<LeadStage, Lead[]> = {} as Record<LeadStage, Lead[]>
    for (const stage of STAGES) map[stage] = []
    for (const lead of filteredLeads.value) {
      if (map[lead.stage]) map[lead.stage].push(lead)
    }
    return map
  })

  // ── Metrics ───────────────────────────────────────────────
  const totalRevenue = computed(() =>
    leads.value.reduce((s, l) => s + (l.revenue || 0), 0),
  )

  const qualifiedCount = computed(() =>
    leads.value.filter(l => l.qualified === 'yes').length,
  )

  const bookedCount = computed(() =>
    leads.value.filter(l =>
      ['Booked Consultation', 'Qualified', 'Proposal Sent', 'Purchased Course', 'Became Consulting Client']
        .includes(l.stage),
    ).length,
  )

  // ── CRUD ─────────────────────────────────────────────────
  async function fetchLeads() {
    loading.value = true
    error.value = null
    try {
      const { data } = await $fetch<{ data: Lead[] }>('/api/leads')
      leads.value = data ?? []
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to load leads'
      leads.value = []
    }
    finally {
      loading.value = false
    }
  }

  async function addLead(payload: LeadInsert): Promise<Lead | null> {
    try {
      const { data } = await $fetch<{ data: Lead }>('/api/leads', {
        method: 'POST',
        body: payload,
      })
      leads.value.unshift(data)
      return data
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to add lead'
      return null
    }
  }

  async function updateLead(id: string, update: LeadUpdate): Promise<boolean> {
    try {
      const { data } = await $fetch<{ data: Lead }>(`/api/leads/${id}`, {
        method: 'PATCH',
        body: update,
      })
      const idx = leads.value.findIndex(l => l.id === id)
      if (idx !== -1) leads.value[idx] = data
      return true
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to update lead'
      return false
    }
  }

  function getById(id: string) {
    return leads.value.find(l => l.id === id) ?? null
  }

  return {
    leads, loading, error,
    filterCampaign, filterStage, filterSearch,
    filteredLeads, leadsByStage,
    totalRevenue, qualifiedCount, bookedCount,
    STAGES,
    fetchLeads, addLead, updateLead, getById,
  }
})
