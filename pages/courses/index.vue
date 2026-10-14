<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Courses</h1>
        <p class="text-slate-400 text-sm mt-1">Registrations, campaign sources, and onboarding</p>
      </div>
      <button class="btn-primary" @click="showForm = !showForm">+ New Course</button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="stat-label">Registrations</div>
        <div class="stat-value">{{ totalRegistrations }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Last 30 Days</div>
        <div class="stat-value text-cyan-400">{{ last30 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Open Onboarding Tasks</div>
        <div class="stat-value text-amber-400">{{ dash?.tasks.length ?? 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Needs Review</div>
        <div class="stat-value" :class="(dash?.failures.length ?? 0) > 0 ? 'text-red-400' : 'text-white'">{{ dash?.failures.length ?? 0 }}</div>
      </div>
    </div>

    <!-- Create course -->
    <form v-if="showForm" class="card space-y-4" @submit.prevent="createCourse">
      <h2 class="text-lg font-semibold text-white">New Course</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="field-label">Title</label>
          <input v-model="form.title" class="field-input" required maxlength="160" @input="autoSlug">
        </div>
        <div>
          <label class="field-label">Page address (/learn/…)</label>
          <input v-model="form.slug" class="field-input" required maxlength="80" pattern="[a-z0-9]+(-[a-z0-9]+)*">
        </div>
        <div class="md:col-span-2">
          <label class="field-label">Summary</label>
          <input v-model="form.summary" class="field-input" maxlength="500">
        </div>
        <div class="md:col-span-2">
          <label class="field-label">Description</label>
          <textarea v-model="form.description" class="field-input" rows="4" maxlength="8000" />
        </div>
        <div>
          <label class="field-label">Start date</label>
          <input v-model="form.starts_on" type="date" class="field-input">
        </div>
        <div>
          <label class="field-label">Format</label>
          <input v-model="form.format" class="field-input" placeholder="Live online, 4 weeks" maxlength="160">
        </div>
        <div>
          <label class="field-label">Price (display only)</label>
          <input v-model.number="form.price" type="number" min="0" step="1" class="field-input">
        </div>
      </div>
      <p class="text-xs text-slate-500">New courses start unpublished. Publish when the page is reviewed.</p>
      <p v-if="formError" class="text-sm text-red-400">{{ formError }}</p>
      <div class="flex gap-2">
        <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Create course' }}</button>
        <button type="button" class="btn-secondary" @click="showForm = false">Cancel</button>
      </div>
    </form>

    <!-- Needs review -->
    <div v-if="dash?.failures.length" class="card space-y-3" style="border-color:rgba(248,113,113,0.3)">
      <h2 class="text-lg font-semibold text-white">Failed submissions — needs review</h2>
      <div v-for="f in dash.failures" :key="f.id" class="flex items-start justify-between gap-4 text-sm border-t border-slate-800 pt-3">
        <div class="min-w-0">
          <div class="text-slate-200">
            {{ payloadName(f.payload) }} <span class="text-slate-500">· {{ f.reference }} · {{ formatDateTime(f.created_at) }}</span>
          </div>
          <div class="text-red-400 text-xs mt-1 break-words">{{ f.error }}</div>
        </div>
        <button class="btn-secondary !py-1 text-xs flex-shrink-0" @click="resolveFailure(f.id)">Mark reviewed</button>
      </div>
    </div>

    <!-- Courses with totals -->
    <div class="card space-y-4">
      <h2 class="text-lg font-semibold text-white">Courses</h2>
      <p v-if="!dash?.courses.length" class="text-slate-500 text-sm">No courses yet.</p>
      <div v-for="c in dash?.courses ?? []" :key="c.id" class="border-t border-slate-800 pt-4 first:border-0 first:pt-0">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="text-white font-medium">
              {{ c.title }}
              <span class="ml-2 text-xs px-2 py-0.5 rounded-full" :class="c.is_active ? 'bg-green-500/15 text-green-400' : 'bg-slate-500/15 text-slate-400'">
                {{ c.is_active ? 'Published' : 'Unpublished' }}
              </span>
            </div>
            <NuxtLink :to="`/learn/${c.slug}`" target="_blank" class="text-xs text-cyan-400 hover:underline">/learn/{{ c.slug }}</NuxtLink>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <div class="text-2xl font-bold text-white">{{ totalsFor(c.id)?.total ?? 0 }}</div>
              <div class="text-xs text-slate-500">registered</div>
            </div>
            <button class="btn-secondary !py-1 text-xs" @click="togglePublished(c)">
              {{ c.is_active ? 'Unpublish' : 'Publish' }}
            </button>
          </div>
        </div>
        <div v-if="totalsFor(c.id)?.bySource.length" class="flex flex-wrap gap-2 mt-3">
          <span v-for="s in totalsFor(c.id)!.bySource" :key="s.source" class="text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-300">
            {{ s.source }} <strong class="text-white">{{ s.count }}</strong>
          </span>
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Onboarding tasks -->
      <div class="card space-y-3">
        <h2 class="text-lg font-semibold text-white">Onboarding tasks</h2>
        <p v-if="!dash?.tasks.length" class="text-slate-500 text-sm">Nothing waiting.</p>
        <label v-for="t in dash?.tasks ?? []" :key="t.id" class="flex items-start gap-3 text-sm cursor-pointer">
          <input type="checkbox" class="mt-0.5" :disabled="busyTask === t.id" @change="completeTask(t.id)">
          <span class="min-w-0">
            <span class="text-slate-200">{{ t.title }}</span>
            <span class="block text-xs" :class="isOverdue(t.due_date) ? 'text-red-400' : 'text-slate-500'">
              Due {{ t.due_date ? formatDate(t.due_date) : '—' }}<template v-if="t.assignee"> · {{ t.assignee }}</template>
            </span>
          </span>
        </label>
      </div>

      <!-- Recent registrations -->
      <div class="card space-y-3">
        <h2 class="text-lg font-semibold text-white">Recent registrations</h2>
        <p v-if="!dash?.recent.length" class="text-slate-500 text-sm">No registrations yet.</p>
        <div v-for="r in dash?.recent ?? []" :key="r.id" class="flex items-start justify-between gap-3 text-sm">
          <div class="min-w-0">
            <div class="text-slate-200 truncate">{{ r.fname }} {{ r.lname }} <span class="text-slate-500">{{ r.email }}</span></div>
            <div class="text-xs text-slate-500">{{ courseTitle(r.course_id) }} · {{ r.utm_source || 'direct / unknown' }}<template v-if="r.utm_campaign"> · {{ r.utm_campaign }}</template></div>
          </div>
          <div class="text-xs text-slate-500 flex-shrink-0">{{ formatDateTime(r.created_at) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Course {
  id: string
  slug: string
  title: string
  is_active: boolean
}
interface Dashboard {
  courses: Course[]
  totals: { course_id: string, total: number, last30Days: number, bySource: { source: string, count: number }[] }[]
  recent: { id: string, created_at: string, course_id: string, fname: string, lname: string, email: string, utm_source: string | null, utm_campaign: string | null }[]
  tasks: { id: string, title: string, due_date: string | null, assignee: string | null }[]
  failures: { id: string, created_at: string, reference: string | null, payload: Record<string, unknown>, error: string }[]
}

const { data: dash, refresh } = await useFetch<Dashboard>('/api/courses')

const totalRegistrations = computed(() => dash.value?.totals.reduce((n, t) => n + t.total, 0) ?? 0)
const last30 = computed(() => dash.value?.totals.reduce((n, t) => n + t.last30Days, 0) ?? 0)
const totalsFor = (id: string) => dash.value?.totals.find(t => t.course_id === id)
const courseTitle = (id: string) => dash.value?.courses.find(c => c.id === id)?.title ?? 'Course'

// ── Create course ─────────────────────────────────────────
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const blank = () => ({ title: '', slug: '', summary: '', description: '', starts_on: '', format: '', price: undefined as number | undefined })
const form = reactive(blank())
let slugTouched = false
watch(() => form.slug, (v) => {
  if (v !== slugify(form.title)) slugTouched = true
})
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
}
function autoSlug() {
  if (!slugTouched) form.slug = slugify(form.title)
}

async function createCourse() {
  formError.value = ''
  saving.value = true
  try {
    const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '' && v !== undefined))
    await $fetch('/api/courses', { method: 'POST', body })
    Object.assign(form, blank())
    slugTouched = false
    showForm.value = false
    await refresh()
  }
  catch (e) {
    formError.value = (e as { data?: { message?: string } }).data?.message || 'Could not create course'
  }
  finally {
    saving.value = false
  }
}

async function togglePublished(c: Course) {
  const action = c.is_active ? 'Unpublish' : 'Publish'
  if (!confirm(`${action} "${c.title}"? ${c.is_active ? 'The landing page will stop accepting registrations.' : 'The landing page will go live at /learn/' + c.slug + '.'}`)) return
  await $fetch(`/api/courses/${c.id}`, { method: 'PATCH', body: { is_active: !c.is_active } })
  await refresh()
}

// ── Tasks & failures ──────────────────────────────────────
const busyTask = ref<string | null>(null)
async function completeTask(id: string) {
  busyTask.value = id
  try {
    await $fetch(`/api/tasks/${id}`, { method: 'PATCH', body: { status: 'done' } })
    await refresh()
  }
  finally {
    busyTask.value = null
  }
}

async function resolveFailure(id: string) {
  await $fetch(`/api/workflow-failures/${id}`, { method: 'PATCH' })
  await refresh()
}

function payloadName(p: Record<string, unknown>) {
  const name = [p.fname, p.lname].filter(Boolean).join(' ')
  return [name, p.email].filter(Boolean).join(' · ') || 'Unknown submitter'
}
function formatDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function isOverdue(d: string | null) {
  return Boolean(d) && d! < new Date().toISOString().slice(0, 10)
}
</script>
