<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Contracts</h1>
        <p class="text-slate-400 text-sm mt-1">Track signed and paid contracts</p>
      </div>
      <button @click="showForm = true" class="btn-primary">+ New Contract</button>
    </div>

    <!-- Revenue Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="stat-label">Total Contracts</div>
        <div class="stat-value">{{ contracts.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Signed</div>
        <div class="stat-value text-cyan-400">{{ signedCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Paid</div>
        <div class="stat-value text-green-400">{{ paidCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value text-green-400">{{ formatCurrency(totalRevenue) }}</div>
      </div>
    </div>

    <!-- Create Form -->
    <div v-if="showForm" class="card space-y-4">
      <h2 class="text-lg font-semibold text-white">New Contract</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="field-label">Lead</label>
          <select v-model="form.lead_id" class="field-input">
            <option value="">— No lead —</option>
            <option v-for="l in leads" :key="l.id" :value="l.id">
              {{ l.fname }} {{ l.lname }}<span v-if="l.org"> ({{ l.org }})</span>
            </option>
          </select>
        </div>
        <div>
          <label class="field-label">Service / Package</label>
          <input v-model="form.service" type="text" class="field-input" placeholder="e.g. 6-Month Consulting Retainer" />
        </div>
        <div>
          <label class="field-label">Contract Value ($)</label>
          <input v-model.number="form.value" type="number" min="0" step="0.01" class="field-input" />
        </div>
        <div>
          <label class="field-label">Payment Method</label>
          <input v-model="form.payment_method" type="text" class="field-input" placeholder="Stripe, ACH, Check…" />
        </div>
        <div>
          <label class="field-label">Signed At (optional)</label>
          <input v-model="form.signed_at" type="datetime-local" class="field-input" />
        </div>
        <div>
          <label class="field-label">Paid At (optional)</label>
          <input v-model="form.paid_at" type="datetime-local" class="field-input" />
        </div>
        <div class="md:col-span-2">
          <label class="field-label">Notes</label>
          <textarea v-model="form.notes" class="field-input" rows="2" placeholder="Payment terms, special conditions…"></textarea>
        </div>
      </div>
      <div class="flex gap-3">
        <button @click="saveContract" :disabled="saving || !form.service" class="btn-primary">
          {{ saving ? 'Saving…' : 'Save Contract' }}
        </button>
        <button @click="resetForm" class="btn-secondary">Cancel</button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-[#070c18] rounded-lg p-1 w-fit">
      <button v-for="tab in tabs" :key="tab.key" @click="activeTab = tab.key"
        :class="activeTab === tab.key ? 'bg-[#0d1628] text-white' : 'text-slate-400 hover:text-slate-200'"
        class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors">
        {{ tab.label }}
      </button>
    </div>

    <!-- Contract List -->
    <div class="card">
      <div class="flex items-center gap-3 mb-4">
        <input v-model="search" type="text" placeholder="Search contracts…" class="field-input flex-1" />
      </div>

      <div v-if="loading" class="text-slate-400 py-8 text-center">Loading…</div>
      <div v-else-if="filtered.length === 0" class="text-slate-400 py-8 text-center">No contracts found.</div>
      <div v-else class="space-y-3">
        <div v-for="c in filtered" :key="c.id" class="bg-[#0b1120] rounded-lg p-4 border border-slate-700/50">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-white font-medium">{{ c.service }}</span>
                <span class="text-green-400 font-semibold">{{ formatCurrency(c.value) }}</span>
              </div>
              <div class="text-slate-400 text-sm mt-1">
                {{ c.lead_name || 'No lead' }}<span v-if="c.lead_org"> · {{ c.lead_org }}</span>
              </div>
              <div class="flex gap-4 mt-2 text-sm flex-wrap">
                <span v-if="c.signed_at" class="text-cyan-400">
                  ✍ Signed {{ formatDate(c.signed_at) }}
                </span>
                <span v-else class="text-slate-500">Not yet signed</span>
                <span v-if="c.paid_at" class="text-green-400">
                  💳 Paid {{ formatDate(c.paid_at) }}
                </span>
                <span v-else class="text-slate-500">Not yet paid</span>
              </div>
              <div v-if="c.payment_method" class="text-slate-400 text-sm mt-1">{{ c.payment_method }}</div>
              <div v-if="c.notes" class="text-slate-400 text-sm mt-2 line-clamp-2">{{ c.notes }}</div>
            </div>
            <div class="flex flex-col gap-1 shrink-0 text-right">
              <button v-if="!c.signed_at" @click="markSigned(c)"
                class="text-xs text-cyan-400 hover:text-cyan-300">Mark Signed</button>
              <button v-if="c.signed_at && !c.paid_at" @click="markPaid(c)"
                class="text-xs text-green-400 hover:text-green-300">Mark Paid</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const tabs = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'signed', label: 'Signed' },
  { key: 'paid', label: 'Paid' },
]
const activeTab = ref('all')
const search = ref('')
const showForm = ref(false)
const saving = ref(false)
const loading = ref(true)
const contracts = ref<any[]>([])

const { data: leadsData } = await useFetch('/api/leads')
const leads = computed(() => (leadsData.value as any)?.data ?? [])

const form = reactive({
  lead_id: '',
  service: '',
  value: 0,
  signed_at: '',
  paid_at: '',
  payment_method: '',
  notes: '',
})

const signedCount = computed(() => contracts.value.filter(c => c.signed_at).length)
const paidCount = computed(() => contracts.value.filter(c => c.paid_at).length)
const totalRevenue = computed(() => contracts.value.filter(c => c.paid_at).reduce((sum, c) => sum + Number(c.value), 0))

const filtered = computed(() => {
  return contracts.value.filter(c => {
    const term = search.value.toLowerCase()
    const matchSearch = !term || (c.service ?? '').toLowerCase().includes(term) ||
      (c.lead_name ?? '').toLowerCase().includes(term) || (c.lead_org ?? '').toLowerCase().includes(term)
    let matchTab = true
    if (activeTab.value === 'pending') matchTab = !c.signed_at
    if (activeTab.value === 'signed') matchTab = !!c.signed_at
    if (activeTab.value === 'paid') matchTab = !!c.paid_at
    return matchSearch && matchTab
  })
})

async function load() {
  loading.value = true
  const res = await $fetch<any>('/api/contracts')
  contracts.value = res.data ?? []
  loading.value = false
}

async function saveContract() {
  if (!form.service) return
  saving.value = true
  await $fetch('/api/contracts', {
    method: 'POST',
    body: {
      ...form,
      lead_id: form.lead_id || null,
      signed_at: form.signed_at ? new Date(form.signed_at).toISOString() : null,
      paid_at: form.paid_at ? new Date(form.paid_at).toISOString() : null,
    },
  })
  await load()
  resetForm()
  saving.value = false
}

async function markSigned(c: any) {
  const now = new Date().toISOString()
  c.signed_at = now
  await $fetch(`/api/contracts/${c.id}`, { method: 'PATCH', body: { signed_at: now } })
}

async function markPaid(c: any) {
  const now = new Date().toISOString()
  c.paid_at = now
  await $fetch(`/api/contracts/${c.id}`, { method: 'PATCH', body: { paid_at: now } })
}

function resetForm() {
  Object.assign(form, { lead_id: '', service: '', value: 0, signed_at: '', paid_at: '', payment_method: '', notes: '' })
  showForm.value = false
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

onMounted(load)
</script>
