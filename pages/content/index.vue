<template>
  <div class="p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-cyan-400">Content Hub</h1>
        <p class="text-sm text-slate-500 mt-0.5">AI-powered publishing for LinkedIn, Facebook, Instagram & Email</p>
      </div>
      <button
        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
        @click="creatorOpen = true"
      >
        ✨ Create Content
      </button>
    </div>

    <!-- Status tabs + platform filter -->
    <div class="flex items-center gap-4 mb-5 flex-wrap">
      <div class="flex gap-1 rounded-lg p-1" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <button
          v-for="s in STATUS_TABS"
          :key="s.value"
          :class="['px-3 py-1 rounded-md text-xs font-semibold transition-colors', activeStatus === s.value ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200']"
          @click="activeStatus = s.value; fetchContent()"
        >
          {{ s.label }}
        </button>
      </div>

      <div class="flex gap-1 rounded-lg p-1" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <button
          v-for="p in PLATFORM_TABS"
          :key="p.value"
          :class="['flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors', activePlatform === p.value ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200']"
          @click="activePlatform = p.value; fetchContent()"
        >
          <span>{{ p.icon }}</span>{{ p.label }}
        </button>
      </div>
    </div>

    <!-- Content grid -->
    <div v-if="loading" class="text-center py-16 text-slate-500">Loading content...</div>

    <div v-else-if="items.length === 0" class="rounded-xl py-16 text-center" style="background:#0d1628;border:1px solid rgba(148,163,184,0.08)">
      <div class="text-4xl mb-3">📝</div>
      <p class="text-slate-400 font-medium mb-1">No content yet</p>
      <p class="text-slate-600 text-sm mb-4">Click "Create Content" to generate your first AI-powered draft</p>
      <button
        class="px-4 py-2 rounded-lg text-sm font-semibold text-cyan-400 transition-colors"
        style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.25)"
        @click="creatorOpen = true"
      >
        ✨ Create with AI
      </button>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="item in items"
        :key="item.id"
        class="rounded-xl p-4 flex flex-col gap-3 hover:border-cyan-500/30 transition-colors"
        style="background:#0d1628;border:1px solid rgba(148,163,184,0.08)"
      >
        <!-- Card header -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-base leading-none">{{ platformIcon(item.platform) }}</span>
            <span :class="platformBadge(item.platform)" class="text-xs px-2 py-0.5 rounded-full font-semibold">
              {{ item.platform }}
            </span>
            <span :class="statusBadge(item.status)" class="text-xs px-2 py-0.5 rounded-full font-semibold capitalize">
              {{ item.status }}
            </span>
          </div>
          <span class="text-xs text-slate-600 flex-shrink-0">{{ relativeDate(item.created_at) }}</span>
        </div>

        <!-- Title -->
        <div class="font-semibold text-slate-100 text-sm leading-snug">{{ item.title }}</div>

        <!-- Body preview -->
        <p class="text-slate-400 text-xs leading-relaxed line-clamp-4">{{ item.body }}</p>

        <!-- Tags + offer -->
        <div class="flex flex-wrap gap-1.5">
          <span v-if="item.offer" class="text-xs px-2 py-0.5 rounded-full text-violet-400" style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.2)">
            {{ offerLabel(item.offer) }}
          </span>
          <span v-if="item.tone" class="text-xs px-2 py-0.5 rounded-full text-slate-400" style="background:rgba(148,163,184,0.08);border:1px solid rgba(148,163,184,0.12)">
            {{ item.tone }}
          </span>
          <span v-for="tag in item.tags.slice(0, 2)" :key="tag" class="text-xs px-2 py-0.5 rounded-full text-cyan-500/70" style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.12)">
            #{{ tag }}
          </span>
        </div>

        <!-- Performance (published only) -->
        <div v-if="item.status === 'published' && hasPerformance(item.performance)" class="flex gap-3 text-xs text-slate-500 pt-1" style="border-top:1px solid rgba(148,163,184,0.06)">
          <span v-if="item.performance.likes">👍 {{ item.performance.likes }}</span>
          <span v-if="item.performance.comments">💬 {{ item.performance.comments }}</span>
          <span v-if="item.performance.shares">🔁 {{ item.performance.shares }}</span>
          <span v-if="item.performance.clicks">🔗 {{ item.performance.clicks }}</span>
          <span v-if="item.performance.leads_generated" class="text-emerald-400">🎯 {{ item.performance.leads_generated }} leads</span>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-1" style="border-top:1px solid rgba(148,163,184,0.06)">
          <button
            class="flex-1 text-xs py-1.5 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
            style="background:rgba(148,163,184,0.06);border:1px solid rgba(148,163,184,0.1)"
            @click="openEdit(item)"
          >
            Edit
          </button>
          <button
            v-if="item.status === 'draft'"
            class="flex-1 text-xs py-1.5 rounded-md font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2)"
            @click="markPublished(item.id)"
          >
            Mark Published
          </button>
          <button
            v-if="item.status === 'draft'"
            class="text-xs py-1.5 px-2.5 rounded-md text-amber-400 hover:text-amber-300 transition-colors"
            style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2)"
            @click="openSchedule(item)"
          >
            Schedule
          </button>
          <button
            class="text-xs py-1.5 px-2.5 rounded-md text-rose-400/70 hover:text-rose-400 transition-colors"
            style="background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.15)"
            @click="deleteItem(item.id)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- AI Content Creator Panel -->
    <Teleport to="body">
      <div v-if="creatorOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.7)">
        <div class="w-full max-w-lg rounded-2xl flex flex-col" style="background:#0d1628;border:1px solid rgba(6,182,212,0.2);max-height:90vh">
          <!-- Modal header -->
          <div class="flex items-center justify-between px-5 py-4" style="border-bottom:1px solid rgba(148,163,184,0.08)">
            <div>
              <div class="font-semibold text-slate-100">✨ Create Content</div>
              <div class="text-xs text-slate-500 mt-0.5">AI generates platform-native drafts and saves them to your Content Hub</div>
            </div>
            <button class="text-slate-500 hover:text-slate-200 text-xl leading-none" @click="creatorOpen = false">×</button>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <!-- Topic -->
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Topic / Angle *</label>
              <input
                v-model="form.topic"
                type="text"
                placeholder="e.g. 5 reasons nonprofits don't get grant funding"
                class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
                style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
              >
            </div>

            <!-- Platform -->
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Platform</label>
              <div class="grid grid-cols-5 gap-1.5">
                <button
                  v-for="p in PLATFORM_OPTIONS"
                  :key="p.value"
                  :class="['flex flex-col items-center gap-1 py-2 rounded-lg text-xs font-medium transition-colors', form.platform === p.value ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300']"
                  :style="form.platform === p.value ? 'background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.3)' : 'background:rgba(148,163,184,0.06);border:1px solid rgba(148,163,184,0.1)'"
                  @click="form.platform = p.value"
                >
                  <span class="text-base">{{ p.icon }}</span>
                  <span>{{ p.label }}</span>
                </button>
              </div>
            </div>

            <!-- Offer + Tone -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1.5">Offer</label>
                <select
                  v-model="form.offer"
                  class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                  style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
                >
                  <option value="">General / Brand</option>
                  <option value="gw101">Grant Writing 101</option>
                  <option value="free_course">Free Course</option>
                  <option value="grants_consulting">Grants Consulting</option>
                  <option value="bh_consulting">BH Consulting</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1.5">Tone</label>
                <select
                  v-model="form.tone"
                  class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                  style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
                >
                  <option value="educational">Educational</option>
                  <option value="promotional">Promotional</option>
                  <option value="story">Story</option>
                  <option value="testimonial">Testimonial</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>
            </div>

            <!-- Optional context -->
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Extra context <span class="text-slate-600 font-normal">(optional)</span></label>
              <textarea
                v-model="form.context"
                rows="2"
                placeholder="Any specific angle, stat, or hook to include..."
                class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none resize-none"
                style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
              />
            </div>

            <!-- Result -->
            <div v-if="creatorResult" class="rounded-lg p-3 text-sm text-emerald-300" style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2)">
              <div class="font-semibold mb-1">{{ creatorResult.savedIds.length }} draft{{ creatorResult.savedIds.length === 1 ? '' : 's' }} created and saved.</div>
              <p class="text-xs text-slate-400 leading-relaxed">{{ creatorResult.strategy_notes.slice(0, 300) }}{{ creatorResult.strategy_notes.length > 300 ? '…' : '' }}</p>
            </div>
            <div v-if="creatorError" class="rounded-lg p-3 text-sm text-rose-400" style="background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.2)">
              {{ creatorError }}
            </div>
          </div>

          <div class="flex gap-3 px-5 py-4" style="border-top:1px solid rgba(148,163,184,0.08)">
            <button
              class="text-slate-400 hover:text-slate-200 text-sm transition-colors"
              @click="creatorOpen = false"
            >
              Close
            </button>
            <button
              :disabled="!form.topic.trim() || creatorLoading"
              class="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 transition-colors"
              @click="runCreator"
            >
              {{ creatorLoading ? '⏳ Generating...' : '✨ Generate & Save Drafts' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Edit / Schedule modal -->
      <div v-if="editItem" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.7)">
        <div class="w-full max-w-2xl rounded-2xl flex flex-col" style="background:#0d1628;border:1px solid rgba(6,182,212,0.15);max-height:90vh">
          <div class="flex items-center justify-between px-5 py-4" style="border-bottom:1px solid rgba(148,163,184,0.08)">
            <div class="font-semibold text-slate-100">Edit Content</div>
            <button class="text-slate-500 hover:text-slate-200 text-xl" @click="editItem = null">×</button>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Title</label>
              <input
                v-model="editForm.title"
                type="text"
                class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Body</label>
              <textarea
                v-model="editForm.body"
                rows="10"
                class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 font-mono text-xs focus:outline-none resize-none leading-relaxed"
                style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1.5">Schedule for (optional)</label>
              <input
                v-model="editForm.scheduled_at"
                type="datetime-local"
                class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
                style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
              >
            </div>
          </div>

          <div class="flex gap-3 px-5 py-4" style="border-top:1px solid rgba(148,163,184,0.08)">
            <button class="text-slate-400 hover:text-slate-200 text-sm" @click="editItem = null">Cancel</button>
            <button
              class="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
              @click="saveEdit"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { ContentItem, ContentPerformance, ContentPlatform } from '~/types'

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Drafts', value: 'draft' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Published', value: 'published' },
]

const PLATFORM_TABS = [
  { label: 'All', value: '', icon: '🌐' },
  { label: 'LinkedIn', value: 'linkedin', icon: '💼' },
  { label: 'Facebook', value: 'facebook', icon: '📘' },
  { label: 'Instagram', value: 'instagram', icon: '📸' },
  { label: 'Email', value: 'email', icon: '✉️' },
]

const PLATFORM_OPTIONS: Array<{ label: string; value: ContentPlatform; icon: string }> = [
  { label: 'LinkedIn', value: 'linkedin', icon: '💼' },
  { label: 'Facebook', value: 'facebook', icon: '📘' },
  { label: 'Instagram', value: 'instagram', icon: '📸' },
  { label: 'Email', value: 'email', icon: '✉️' },
  { label: 'All', value: 'all', icon: '🌐' },
]

const items = ref<ContentItem[]>([])
const loading = ref(false)
const activeStatus = ref('')
const activePlatform = ref('')

const creatorOpen = ref(false)
const creatorLoading = ref(false)
const creatorResult = ref<{ savedIds: string[]; strategy_notes: string } | null>(null)
const creatorError = ref('')

const form = reactive({
  topic: '',
  platform: 'linkedin' as ContentItem['platform'],
  offer: '' as string,
  tone: 'educational' as ContentItem['tone'],
  context: '',
})

const editItem = ref<ContentItem | null>(null)
const editForm = reactive({ title: '', body: '', scheduled_at: '' })

async function fetchContent() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (activeStatus.value) params.status = activeStatus.value
    if (activePlatform.value) params.platform = activePlatform.value

    const res = await $fetch<{ data: ContentItem[] }>('/api/content', { params })
    items.value = res.data ?? []
  }
  finally {
    loading.value = false
  }
}

async function runCreator() {
  if (!form.topic.trim()) return
  creatorLoading.value = true
  creatorResult.value = null
  creatorError.value = ''

  try {
    const res = await $fetch<{ data: { savedIds: string[]; strategy_notes: string } }>('/api/ai/content-create', {
      method: 'POST',
      body: {
        topic: form.topic,
        platform: form.platform,
        offer: form.offer || undefined,
        tone: form.tone || 'educational',
        context: form.context || undefined,
      },
    })
    creatorResult.value = res.data
    form.topic = ''
    form.context = ''
    await fetchContent()
  }
  catch (e: unknown) {
    creatorError.value = e instanceof Error ? e.message : 'Content creation failed'
  }
  finally {
    creatorLoading.value = false
  }
}

async function markPublished(id: string) {
  await $fetch(`/api/content/${id}`, { method: 'PATCH', body: { status: 'published' } })
  await fetchContent()
}

async function deleteItem(id: string) {
  if (!confirm('Delete this content item?')) return
  await $fetch(`/api/content/${id}`, { method: 'DELETE' })
  await fetchContent()
}

function openEdit(item: ContentItem) {
  editItem.value = item
  editForm.title = item.title
  editForm.body = item.body
  editForm.scheduled_at = item.scheduled_at
    ? new Date(item.scheduled_at).toISOString().slice(0, 16)
    : ''
}

function openSchedule(item: ContentItem) {
  openEdit(item)
}

async function saveEdit() {
  if (!editItem.value) return
  const body: Record<string, unknown> = {
    title: editForm.title,
    body: editForm.body,
  }
  if (editForm.scheduled_at) {
    body.scheduled_at = new Date(editForm.scheduled_at).toISOString()
    body.status = 'scheduled'
  }
  await $fetch(`/api/content/${editItem.value.id}`, { method: 'PATCH', body })
  editItem.value = null
  await fetchContent()
}

// ── Helpers ───────────────────────────────────────────────
function platformIcon(platform: string): string {
  const map: Record<string, string> = { linkedin: '💼', facebook: '📘', instagram: '📸', email: '✉️', all: '🌐' }
  return map[platform] ?? '📄'
}

function platformBadge(platform: string): string {
  const map: Record<string, string> = {
    linkedin: 'text-blue-400',
    facebook: 'text-indigo-400',
    instagram: 'text-pink-400',
    email: 'text-amber-400',
    all: 'text-cyan-400',
  }
  return `${map[platform] ?? 'text-slate-400'}`
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    draft: 'text-slate-400 bg-slate-700/30 border border-slate-600/30',
    scheduled: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
    published: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
    archived: 'text-slate-600 bg-slate-800/30 border border-slate-700/20',
  }
  return map[status] ?? 'text-slate-400'
}

function offerLabel(offer: string): string {
  const map: Record<string, string> = {
    gw101: 'GW 101',
    grants_consulting: 'Grants Consulting',
    bh_consulting: 'BH Consulting',
    free_course: 'Free Course',
    general: 'General',
  }
  return map[offer] ?? offer
}

function hasPerformance(p: ContentPerformance): boolean {
  return Object.values(p).some(v => v != null && v > 0)
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86_400_000)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

onMounted(fetchContent)
</script>
