<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Appointments</h1>
        <p class="text-slate-400 text-sm mt-1">Schedule and manage all appointments</p>
      </div>
      <button @click="showForm = true" class="btn-primary">+ New Appointment</button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="stat-label">Total</div>
        <div class="stat-value">{{ appointments.length }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Upcoming</div>
        <div class="stat-value text-cyan-400">{{ upcoming }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-value text-green-400">{{ completedCount }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cancelled / No Show</div>
        <div class="stat-value text-red-400">{{ cancelledCount }}</div>
      </div>
    </div>

    <!-- Create Form -->
    <div v-if="showForm" class="card space-y-4">
      <h2 class="text-lg font-semibold text-white">New Appointment</h2>
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
          <label class="field-label">Title</label>
          <input v-model="form.title" type="text" class="field-input" placeholder="e.g. Discovery Call" />
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
          <label class="field-label">Type</label>
          <select v-model="form.type" class="field-input">
            <option value="consultation">Consultation</option>
            <option value="sales_call">Sales Call</option>
            <option value="follow_up">Follow-Up</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label class="field-label">Location / Link</label>
          <input v-model="form.location" type="text" class="field-input" placeholder="Zoom link, address, phone…" />
        </div>
        <div class="md:col-span-2">
          <label class="field-label">Notes</label>
          <textarea v-model="form.notes" class="field-input" rows="2" placeholder="Agenda, prep notes…"></textarea>
        </div>
      </div>
      <div class="flex gap-3">
        <button @click="saveAppointment" :disabled="saving || !form.title" class="btn-primary">
          {{ saving ? 'Saving…' : 'Save Appointment' }}
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

    <!-- List -->
    <div class="card">
      <div class="flex items-center gap-3 mb-4">
        <input v-model="search" type="text" placeholder="Search appointments…" class="field-input flex-1" />
      </div>

      <div v-if="loading" class="text-slate-400 py-8 text-center">Loading…</div>
      <div v-else-if="filteredAppts.length === 0" class="text-slate-400 py-8 text-center">No appointments found.</div>
      <div v-else class="space-y-3">
        <div v-for="a in filteredAppts" :key="a.id" class="bg-[#0b1120] rounded-lg p-4 border border-slate-700/50">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-white font-medium">{{ a.title }}</span>
                <span :class="statusClass(a.status)" class="px-2 py-0.5 rounded-full text-xs font-medium">
                  {{ a.status }}
                </span>
                <span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full text-xs">{{ a.type }}</span>
              </div>
              <div class="text-slate-400 text-sm mt-1">
                {{ a.lead_name || 'No lead' }}<span v-if="a.lead_org"> · {{ a.lead_org }}</span>
              </div>
              <div class="text-slate-300 text-sm mt-1">
                {{ formatDate(a.scheduled_at) }} · {{ a.duration_minutes }} min
              </div>
              <div v-if="a.location" class="text-cyan-400 text-sm mt-1">📍 {{ a.location }}</div>
              <div v-if="a.notes" class="text-slate-400 text-sm mt-2 line-clamp-2">{{ a.notes }}</div>
            </div>
            <div class="flex flex-col gap-1 shrink-0">
              <button v-if="a.status === 'scheduled'" @click="markStatus(a, 'completed')"
                class="text-xs text-green-400 hover:text-green-300">Mark Done</button>
              <button v-if="a.status === 'scheduled'" @click="markStatus(a, 'cancelled')"
                class="text-xs text-red-400 hover:text-red-300">Cancel</button>
              <button @click="deleteAppt(a.id)" class="text-xs text-slate-500 hover:text-slate-300">Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Appointment {
  id: string
  title?: string
  scheduled_at: string
  duration_minutes?: number
  type?: string
  status: string
  notes?: string
  location?: string
  lead_id?: string | null
  lead_name?: string | null
  lead_org?: string | null
}

const tabs = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
]
const activeTab = ref('upcoming')
const search = ref('')
const showForm = ref(false)
const saving = ref(false)
const loading = ref(true)
const appointments = ref<Appointment[]>([])

const { data: leadsData } = await useFetch('/api/leads')
const leads = computed(() => (leadsData.value as { data?: { id: string; fname: string; lname: string; org?: string }[] } | null)?.data ?? [])

const form = reactive({
  lead_id: '',
  title: '',
  scheduled_at: new Date().toISOString().slice(0, 16),
  duration_minutes: 60,
  type: 'consultation',
  status: 'scheduled',
  notes: '',
  location: '',
})

const upcoming = computed(() => appointments.value.filter(a => a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date()).length)
const completedCount = computed(() => appointments.value.filter(a => a.status === 'completed').length)
const cancelledCount = computed(() => appointments.value.filter(a => ['cancelled', 'no_show'].includes(a.status)).length)

const filteredAppts = computed(() => {
  const now = new Date()
  return appointments.value.filter(a => {
    const term = search.value.toLowerCase()
    const matchSearch = !term || (a.title ?? '').toLowerCase().includes(term) ||
      (a.lead_name ?? '').toLowerCase().includes(term) || (a.lead_org ?? '').toLowerCase().includes(term)
    let matchTab = true
    if (activeTab.value === 'upcoming') matchTab = a.status === 'scheduled' && new Date(a.scheduled_at) >= now
    if (activeTab.value === 'completed') matchTab = a.status === 'completed'
    return matchSearch && matchTab
  })
})

async function load() {
  loading.value = true
  const res = await $fetch<{ data: Appointment[] }>('/api/appointments')
  appointments.value = res.data ?? []
  loading.value = false
}

async function saveAppointment() {
  if (!form.title) return
  saving.value = true
  await $fetch('/api/appointments', {
    method: 'POST',
    body: {
      ...form,
      lead_id: form.lead_id || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    },
  })
  await load()
  resetForm()
  saving.value = false
}

async function markStatus(a: Appointment, status: string) {
  a.status = status
  await $fetch(`/api/appointments/${a.id}`, { method: 'PATCH', body: { status } })
}

async function deleteAppt(id: string) {
  appointments.value = appointments.value.filter(a => a.id !== id)
  await $fetch(`/api/appointments/${id}`, { method: 'DELETE' })
}

function resetForm() {
  Object.assign(form, { lead_id: '', title: '', scheduled_at: new Date().toISOString().slice(0, 16), duration_minutes: 60, type: 'consultation', status: 'scheduled', notes: '', location: '' })
  showForm.value = false
}

function statusClass(s: string) {
  return {
    scheduled: 'bg-cyan-900/40 text-cyan-400',
    completed: 'bg-green-900/40 text-green-400',
    cancelled: 'bg-red-900/40 text-red-400',
    no_show: 'bg-orange-900/40 text-orange-400',
  }[s] ?? 'bg-slate-700 text-slate-400'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

onMounted(load)
</script>
