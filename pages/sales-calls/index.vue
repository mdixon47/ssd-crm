<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Sales Calls</h1>
        <p class="text-slate-400 text-sm mt-1">Log and track all sales calls</p>
      </div>
      <button @click="showForm = true" class="btn-primary">+ Log Call</button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="stat-label">Total Calls</div>
        <div class="stat-value">{{ calls.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-value text-green-400">{{ completed }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Scheduled</div>
        <div class="stat-value text-cyan-400">{{ scheduled }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">No Shows</div>
        <div class="stat-value text-red-400">{{ noShows }}</div>
      </div>
    </div>

    <!-- Log Call Form -->
    <div v-if="showForm" class="card space-y-4">
      <h2 class="text-lg font-semibold text-white">Log Sales Call</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="field-label">Lead</label>
          <select v-model="form.lead_id" class="field-input">
            <option value="">— No lead —</option>
            <option v-for="l in leads" :key="l.id" :value="l.id">
              {{ l.fname }} {{ l.lname }} <span v-if="l.org">({{ l.org }})</span>
            </option>
          </select>
        </div>
        <div>
          <label class="field-label">Scheduled At</label>
          <input v-model="form.scheduled_at" type="datetime-local" class="field-input" />
        </div>
        <div>
          <label class="field-label">Duration (minutes)</label>
          <input v-model.number="form.duration_minutes" type="number" min="5" max="480" class="field-input" />
        </div>
        <div>
          <label class="field-label">Outcome</label>
          <select v-model="form.outcome" class="field-input">
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="no_show">No Show</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label class="field-label">Next Step</label>
          <input v-model="form.next_step" type="text" class="field-input" placeholder="e.g. Send proposal by Friday" />
        </div>
        <div>
          <label class="field-label">Packages Discussed</label>
          <input v-model="packagesInput" type="text" class="field-input" placeholder="Comma-separated: Basic, Pro, Elite" />
        </div>
        <div class="md:col-span-2">
          <label class="field-label">Notes</label>
          <textarea v-model="form.notes" class="field-input" rows="3" placeholder="Key takeaways, objections, next steps..."></textarea>
        </div>
      </div>
      <div class="flex gap-3">
        <button @click="saveCall" :disabled="saving" class="btn-primary">{{ saving ? 'Saving…' : 'Save Call' }}</button>
        <button @click="resetForm" class="btn-secondary">Cancel</button>
      </div>
    </div>

    <!-- Call List -->
    <div class="card">
      <div class="flex items-center gap-3 mb-4">
        <input v-model="search" type="text" placeholder="Search calls…" class="field-input flex-1" />
        <select v-model="filterOutcome" class="field-input w-44">
          <option value="">All outcomes</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="no_show">No Show</option>
          <option value="rescheduled">Rescheduled</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div v-if="loading" class="text-slate-400 py-8 text-center">Loading…</div>
      <div v-else-if="filtered.length === 0" class="text-slate-400 py-8 text-center">No calls found.</div>
      <div v-else class="space-y-3">
        <div v-for="c in filtered" :key="c.id" class="bg-[#0b1120] rounded-lg p-4 border border-slate-700/50">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-white font-medium">{{ c.lead_name || 'No lead' }}</span>
                <span v-if="c.lead_org" class="text-slate-400 text-sm">· {{ c.lead_org }}</span>
                <span :class="outcomeClass(c.outcome)" class="px-2 py-0.5 rounded-full text-xs font-medium">
                  {{ c.outcome }}
                </span>
              </div>
              <div class="text-slate-400 text-sm mt-1">
                {{ formatDate(c.scheduled_at) }} · {{ c.duration_minutes }} min
              </div>
              <div v-if="c.packages_discussed?.length" class="text-slate-300 text-sm mt-1">
                Packages: {{ c.packages_discussed.join(', ') }}
              </div>
              <div v-if="c.next_step" class="text-cyan-400 text-sm mt-1">→ {{ c.next_step }}</div>
              <div v-if="c.notes" class="text-slate-400 text-sm mt-2 line-clamp-2">{{ c.notes }}</div>
            </div>
            <button @click="editingId = c.id" class="text-slate-500 hover:text-slate-300 text-sm shrink-0">Edit</button>
          </div>

          <!-- Inline edit -->
          <div v-if="editingId === c.id" class="mt-4 border-t border-slate-700 pt-4 space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="field-label">Outcome</label>
                <select v-model="c.outcome" class="field-input">
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="no_show">No Show</option>
                  <option value="rescheduled">Rescheduled</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label class="field-label">Next Step</label>
                <input v-model="c.next_step" type="text" class="field-input" />
              </div>
              <div class="col-span-2">
                <label class="field-label">Notes</label>
                <textarea v-model="c.notes" class="field-input" rows="2"></textarea>
              </div>
            </div>
            <div class="flex gap-2">
              <button @click="updateCall(c)" class="btn-primary text-sm">Save</button>
              <button @click="editingId = null" class="btn-secondary text-sm">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data: leadsData } = await useFetch('/api/leads')
const leads = computed(() => (leadsData.value as any)?.data ?? [])

const calls = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const showForm = ref(false)
const editingId = ref<string | null>(null)
const search = ref('')
const filterOutcome = ref('')

const form = reactive({
  lead_id: '',
  scheduled_at: new Date().toISOString().slice(0, 16),
  duration_minutes: 30,
  outcome: 'scheduled',
  notes: '',
  next_step: '',
  packages_discussed: [] as string[],
})
const packagesInput = ref('')

const completed = computed(() => calls.value.filter(c => c.outcome === 'completed').length)
const scheduled = computed(() => calls.value.filter(c => c.outcome === 'scheduled').length)
const noShows = computed(() => calls.value.filter(c => c.outcome === 'no_show').length)

const filtered = computed(() => {
  return calls.value.filter(c => {
    const term = search.value.toLowerCase()
    const matchSearch = !term || (c.lead_name ?? '').toLowerCase().includes(term) ||
      (c.lead_org ?? '').toLowerCase().includes(term) ||
      (c.next_step ?? '').toLowerCase().includes(term)
    const matchOutcome = !filterOutcome.value || c.outcome === filterOutcome.value
    return matchSearch && matchOutcome
  })
})

async function load() {
  loading.value = true
  const res = await $fetch<any>('/api/sales-calls')
  calls.value = res.data ?? []
  loading.value = false
}

async function saveCall() {
  saving.value = true
  const payload = {
    ...form,
    lead_id: form.lead_id || null,
    scheduled_at: new Date(form.scheduled_at).toISOString(),
    packages_discussed: packagesInput.value ? packagesInput.value.split(',').map(s => s.trim()).filter(Boolean) : [],
  }
  await $fetch('/api/sales-calls', { method: 'POST', body: payload })
  await load()
  resetForm()
  saving.value = false
}

async function updateCall(c: any) {
  await $fetch(`/api/sales-calls/${c.id}`, {
    method: 'PATCH',
    body: { outcome: c.outcome, notes: c.notes, next_step: c.next_step },
  })
  editingId.value = null
}

function resetForm() {
  Object.assign(form, { lead_id: '', scheduled_at: new Date().toISOString().slice(0, 16), duration_minutes: 30, outcome: 'scheduled', notes: '', next_step: '' })
  packagesInput.value = ''
  showForm.value = false
}

function outcomeClass(o: string) {
  return {
    completed: 'bg-green-900/40 text-green-400',
    scheduled: 'bg-cyan-900/40 text-cyan-400',
    no_show: 'bg-red-900/40 text-red-400',
    rescheduled: 'bg-yellow-900/40 text-yellow-400',
    cancelled: 'bg-slate-700 text-slate-400',
  }[o] ?? 'bg-slate-700 text-slate-400'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

onMounted(load)
</script>
