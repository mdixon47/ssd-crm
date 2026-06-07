<template>
  <div class="p-6 max-w-5xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-primary">Negative Keywords</h1>
        <p class="text-sm text-slate-500 mt-0.5">Block irrelevant searches and protect budget</p>
      </div>
      <div class="flex gap-2">
        <button
          class="flex items-center gap-2 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-50 transition"
          @click="showUploadConfirm = true"
        >
          ⬆ Upload to Google Ads
        </button>
        <button
          class="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light transition"
          @click="showAddModal = true"
        >
          + Add Keyword
        </button>
      </div>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div v-for="stat in stats" :key="stat.label" class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-center">
        <div class="text-2xl font-bold" :class="stat.color">{{ stat.value }}</div>
        <div class="text-xs text-slate-500 mt-0.5">{{ stat.label }}</div>
      </div>
    </div>

    <!-- Filter + search -->
    <div class="flex gap-3 mb-5 flex-wrap">
      <select v-model="filterCampaign" class="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
        <option value="">All Campaigns</option>
        <option value="account">Account-Level</option>
        <option v-for="c in GOOGLE_CAMPAIGNS" :key="c.id" :value="c.name">{{ c.name }}</option>
      </select>
      <select v-model="filterMatchType" class="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
        <option value="">All Match Types</option>
        <option>Exact</option>
        <option>Phrase</option>
        <option>Broad</option>
      </select>
      <input
        v-model="filterSearch"
        type="text"
        placeholder="Search keywords..."
        class="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white w-52 focus:outline-none focus:border-primary/50"
      >
      <div class="ml-auto text-sm text-slate-400 self-center">{{ filteredKeywords.length }} keywords</div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="w-8 px-4 py-3">
                <input type="checkbox" class="accent-primary" @change="toggleAll" />
              </th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Keyword</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Match Type</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Applied To</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reason</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="kw in filteredKeywords"
              :key="kw.id"
              class="hover:bg-slate-50/50 transition-colors"
              :class="{ 'bg-amber-50/30': kw.status === 'pending' }"
            >
              <td class="px-4 py-3">
                <input v-model="selected" type="checkbox" :value="kw.id" class="accent-primary" />
              </td>
              <td class="px-4 py-3">
                <span class="font-mono font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">{{ kw.keyword }}</span>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs font-medium" :class="matchClass(kw.match_type)">{{ kw.match_type }}</span>
              </td>
              <td class="px-4 py-3 text-slate-600 text-sm">{{ kw.campaign || 'Account-Level' }}</td>
              <td class="px-4 py-3 text-slate-500 text-xs">{{ kw.reason || '—' }}</td>
              <td class="px-4 py-3 text-center">
                <span
                  class="text-xs px-2 py-0.5 rounded-full font-medium"
                  :class="kw.status === 'applied' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
                >
                  {{ kw.status === 'applied' ? '✓ Applied' : '⏳ Pending' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button class="text-xs text-red-500 hover:text-red-700 hover:underline" @click="removeKeyword(kw.id)">Remove</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Bulk actions -->
    <div v-if="selected.length" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-40">
      <span class="text-sm font-medium">{{ selected.length }} selected</span>
      <button class="text-sm text-green-400 hover:text-green-300 font-semibold" @click="markApplied">Mark Applied</button>
      <button class="text-sm text-red-400 hover:text-red-300 font-semibold" @click="removeSelected">Delete Selected</button>
      <button class="text-xs text-slate-400 hover:text-white" @click="selected = []">Clear</button>
    </div>

    <!-- Upload Confirm Modal -->
    <div v-if="showUploadConfirm" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="showUploadConfirm = false">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h3 class="font-bold text-primary text-lg mb-2">Upload Negative Keywords</h3>
        <p class="text-sm text-slate-600 mb-2">
          This will upload <strong>{{ pendingKeywords.length }}</strong> pending keywords to Google Ads via the MCP tool.
        </p>
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-4">
          ⚠️ This action will run in <strong>dry_run mode</strong> first. Review the preview before confirming live upload.
        </div>
        <div class="font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
          <div v-for="kw in pendingKeywords.slice(0, 10)" :key="kw.id" class="text-slate-600">
            {{ kw.keyword }} ({{ kw.match_type }}) → {{ kw.campaign || 'Account' }}
          </div>
          <div v-if="pendingKeywords.length > 10" class="text-slate-400">...and {{ pendingKeywords.length - 10 }} more</div>
        </div>
        <div class="flex justify-end gap-2">
          <button class="px-4 py-2 border border-slate-200 rounded-lg text-sm" @click="showUploadConfirm = false">Cancel</button>
          <button class="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold" @click="uploadDryRun">Run Dry-Run Preview</button>
        </div>
      </div>
    </div>

    <!-- Add Keyword Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="showAddModal = false">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h3 class="font-bold text-primary mb-4">Add Negative Keyword</h3>
        <div class="space-y-3">
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Keyword *</label>
            <input v-model="newKw.keyword" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" placeholder="e.g. free, jobs, salary" />
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Match Type</label>
            <div class="flex gap-2">
              <button
                v-for="mt in ['Broad','Phrase','Exact']"
                :key="mt"
                :class="['flex-1 py-2 rounded-lg text-sm font-medium border transition-colors', newKw.match_type === mt ? 'bg-primary text-white border-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300']"
                @click="newKw.match_type = mt"
              >
                {{ mt }}
              </button>
            </div>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Apply To</label>
            <select v-model="newKw.campaign" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="">Account-Level (all campaigns)</option>
              <option v-for="c in GOOGLE_CAMPAIGNS" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Reason</label>
            <input v-model="newKw.reason" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" placeholder="Why are we blocking this?" />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="px-4 py-2 border border-slate-200 rounded-lg text-sm" @click="showAddModal = false">Cancel</button>
          <button class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold" @click="addKeyword">Add Keyword</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GOOGLE_CAMPAIGNS } from '~/lib/mockData'
import type { NegativeKeyword } from '~/types'

const SEED_NEGATIVES: NegativeKeyword[] = [
  { id: '1', keyword: 'free', match_type: 'Broad', campaign: '', reason: 'Job seekers / non-buyers', status: 'applied', created_at: '' },
  { id: '2', keyword: 'jobs', match_type: 'Broad', campaign: '', reason: 'Employment seekers', status: 'applied', created_at: '' },
  { id: '3', keyword: 'salary', match_type: 'Broad', campaign: '', reason: 'Employment research', status: 'applied', created_at: '' },
  { id: '4', keyword: 'template', match_type: 'Broad', campaign: '', reason: 'DIY / not consulting', status: 'applied', created_at: '' },
  { id: '5', keyword: 'sample', match_type: 'Broad', campaign: '', reason: 'Research only', status: 'applied', created_at: '' },
  { id: '6', keyword: 'example', match_type: 'Broad', campaign: '', reason: 'Research only', status: 'applied', created_at: '' },
  { id: '7', keyword: 'reddit', match_type: 'Broad', campaign: '', reason: 'Forum traffic', status: 'applied', created_at: '' },
  { id: '8', keyword: 'youtube', match_type: 'Broad', campaign: '', reason: 'Video search', status: 'applied', created_at: '' },
  { id: '9', keyword: 'personal grant', match_type: 'Phrase', campaign: '', reason: 'Individual grants (not nonprofit)', status: 'applied', created_at: '' },
  { id: '10', keyword: 'government grant', match_type: 'Phrase', campaign: 'Free Grant Writing Course', reason: 'Mostly individual applicants', status: 'applied', created_at: '' },
  { id: '11', keyword: 'grant writing software', match_type: 'Phrase', campaign: '', reason: 'Software buyers not consulting', status: 'applied', created_at: '' },
  { id: '12', keyword: 'DIY grant writing', match_type: 'Phrase', campaign: '', reason: 'Not looking for consultant', status: 'applied', created_at: '' },
]

const keywords = ref<NegativeKeyword[]>([...SEED_NEGATIVES])
const filterCampaign = ref('')
const filterMatchType = ref('')
const filterSearch = ref('')
const selected = ref<string[]>([])
const showAddModal = ref(false)
const showUploadConfirm = ref(false)
const newKw = reactive({ keyword: '', match_type: 'Broad', campaign: '', reason: '', status: 'pending' as const })

const filteredKeywords = computed(() => {
  let list = keywords.value
  if (filterCampaign.value === 'account') list = list.filter(k => !k.campaign)
  else if (filterCampaign.value) list = list.filter(k => k.campaign === filterCampaign.value)
  if (filterMatchType.value) list = list.filter(k => k.match_type === filterMatchType.value)
  if (filterSearch.value) list = list.filter(k => k.keyword.includes(filterSearch.value.toLowerCase()))
  return list
})

const pendingKeywords = computed(() => keywords.value.filter(k => k.status === 'pending'))

const stats = computed(() => [
  { label: 'Total Negatives', value: keywords.value.length, color: 'text-primary' },
  { label: 'Applied', value: keywords.value.filter(k => k.status === 'applied').length, color: 'text-green-600' },
  { label: 'Pending Upload', value: pendingKeywords.value.length, color: 'text-amber-600' },
  { label: 'Account-Level', value: keywords.value.filter(k => !k.campaign).length, color: 'text-slate-700' },
])

function matchClass(mt: string) {
  return mt === 'Exact' ? 'text-purple-600' : mt === 'Phrase' ? 'text-blue-600' : 'text-slate-600'
}

function addKeyword() {
  if (!newKw.keyword.trim()) return
  keywords.value.push({
    id: String(Date.now()), ...newKw, created_at: new Date().toISOString(),
  })
  Object.assign(newKw, { keyword: '', match_type: 'Broad', campaign: '', reason: '' })
  showAddModal.value = false
}

function removeKeyword(id: string) {
  keywords.value = keywords.value.filter(k => k.id !== id)
  selected.value = selected.value.filter(s => s !== id)
}

function removeSelected() {
  keywords.value = keywords.value.filter(k => !selected.value.includes(k.id))
  selected.value = []
}

function markApplied() {
  keywords.value.forEach(k => { if (selected.value.includes(k.id)) k.status = 'applied' })
  selected.value = []
}

function toggleAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  selected.value = checked ? filteredKeywords.value.map(k => k.id) : []
}

function uploadDryRun() {
  showUploadConfirm.value = false
  alert('Dry-run complete (mock). In production, connect GOOGLE_ADS_DEVELOPER_TOKEN to upload live. Review the console for the dry-run payload.')
}
</script>
