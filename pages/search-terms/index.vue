<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-primary">Search Terms</h1>
        <p class="text-sm text-slate-500 mt-0.5">Label, triage, and act on Google Ads search queries</p>
      </div>
      <div class="flex gap-2">
        <button
          :disabled="labeling"
          class="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-amber-500 transition disabled:opacity-50"
          @click="runAILabel"
        >
          <span>✨</span>
          {{ labeling ? 'Labeling...' : 'AI Auto-Label' }}
        </button>
        <button
          class="flex items-center gap-2 border border-slate-200 px-4 py-2 rounded-lg text-sm hover:border-slate-300"
          @click="showAddModal = true"
        >
          + Add Term
        </button>
      </div>
    </div>

    <!-- Label filter pills -->
    <div class="flex gap-2 mb-5 flex-wrap">
      <button
        v-for="f in LABEL_FILTERS"
        :key="f.value"
        :class="['text-sm px-3 py-1.5 rounded-full font-medium transition-colors border', filterLabel === f.value ? f.activeClass : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300']"
        @click="filterLabel = filterLabel === f.value ? '' : f.value"
      >
        {{ f.icon }} {{ f.label }}
        <span class="ml-1 opacity-70">({{ countByLabel(f.value) }})</span>
      </button>
      <input
        v-model="filterSearch"
        type="text"
        placeholder="Filter terms..."
        class="ml-auto border border-slate-200 rounded-full px-3 py-1.5 text-sm focus:outline-none focus:border-primary/50 w-44"
      >
    </div>

    <!-- AI results banner -->
    <div v-if="aiLabelResult" class="mb-5 bg-green-50 border border-green-200 rounded-xl p-4">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-green-600 font-bold text-sm">✅ AI labeled {{ aiLabelResult.high }} terms with high confidence, {{ aiLabelResult.applied }} applied automatically</span>
      </div>
      <p class="text-xs text-green-700">Medium/low confidence terms are shown with suggestions — review and approve each one manually.</p>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Search Term</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Campaign</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">Impressions</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">Clicks</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">Conv.</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">Cost</th>
              <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500">Label</th>
              <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="term in filteredTerms"
              :key="term.term"
              class="hover:bg-slate-50/50 transition-colors"
            >
              <td class="px-4 py-3 font-medium text-slate-800">{{ term.term }}</td>
              <td class="px-4 py-3 text-slate-500 text-xs">{{ term.campaign }}</td>
              <td class="px-4 py-3 text-right text-slate-600">{{ term.impressions.toLocaleString() }}</td>
              <td class="px-4 py-3 text-right text-slate-600">{{ term.clicks }}</td>
              <td class="px-4 py-3 text-right font-semibold" :class="term.conversions > 0 ? 'text-green-600' : 'text-slate-400'">{{ term.conversions }}</td>
              <td class="px-4 py-3 text-right text-slate-600">${{ term.cost }}</td>
              <td class="px-4 py-3 text-center">
                <div v-if="editingLabel === term.term" class="flex gap-1 justify-center flex-wrap">
                  <button
                    v-for="l in LABELS"
                    :key="l.value"
                    :class="['text-xs px-2 py-0.5 rounded-full font-medium border transition-colors', l.class]"
                    @click="applyLabel(term, l.value); editingLabel = ''"
                  >
                    {{ l.icon }} {{ l.label }}
                  </button>
                </div>
                <span
                  v-else
                  :class="['text-xs px-2.5 py-1 rounded-full font-semibold cursor-pointer', labelClass(term.label)]"
                  @click="editingLabel = term.term"
                >
                  {{ labelIcon(term.label) }} {{ term.label || 'Unlabeled' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  v-if="term.label === 'negative'"
                  class="text-xs text-red-600 hover:underline font-medium"
                  @click="addToNegatives(term.term)"
                >
                  → Add Negative
                </button>
                <button
                  v-else
                  class="text-xs text-slate-400 hover:text-primary hover:underline"
                  @click="editingLabel = term.term"
                >
                  Label
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Term Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="showAddModal = false">
      <div class="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h3 class="font-bold text-primary mb-4">Add Search Term</h3>
        <div class="space-y-3">
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Search Term *</label>
            <input v-model="newTerm.term" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" >
          </div>
          <div>
            <label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Campaign</label>
            <select v-model="newTerm.campaign" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option v-for="c in GOOGLE_CAMPAIGNS" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div><label class="text-xs font-semibold text-slate-500 block mb-1.5">Impressions</label><input v-model.number="newTerm.impressions" type="number" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" ></div>
            <div><label class="text-xs font-semibold text-slate-500 block mb-1.5">Clicks</label><input v-model.number="newTerm.clicks" type="number" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" ></div>
            <div><label class="text-xs font-semibold text-slate-500 block mb-1.5">Cost ($)</label><input v-model.number="newTerm.cost" type="number" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" ></div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="px-4 py-2 border border-slate-200 rounded-lg text-sm" @click="showAddModal = false">Cancel</button>
          <button class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold" @click="addNewTerm">Add Term</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAI } from '~/composables/useAI'
import { GOOGLE_CAMPAIGNS, MOCK_SEARCH_TERMS } from '~/lib/mockData'
import type { SearchTerm } from '~/types'

const { labelSearchTerms } = useAI()

const terms = ref<SearchTerm[]>([...MOCK_SEARCH_TERMS])
const filterLabel = ref('')
const filterSearch = ref('')
const editingLabel = ref('')
const labeling = ref(false)
const showAddModal = ref(false)
const aiLabelResult = ref<{ high: number; applied: number } | null>(null)

const newTerm = reactive({ term: '', campaign: '', impressions: 0, clicks: 0, cost: 0, conversions: 0, label: '' as string })

const LABELS = [
  { value: 'keep', label: 'Keep', icon: '✅', class: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
  { value: 'watch', label: 'Watch', icon: '👁', class: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
  { value: 'negative', label: 'Negative', icon: '🚫', class: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  { value: 'build_page', label: 'Build Page', icon: '📄', class: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
  { value: 'new_campaign', label: 'New Campaign', icon: '🚀', class: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
]

const LABEL_FILTERS = [
  { value: 'keep', label: 'Keep', icon: '✅', activeClass: 'bg-green-100 border-green-400 text-green-700' },
  { value: 'watch', label: 'Watch', icon: '👁', activeClass: 'bg-blue-100 border-blue-400 text-blue-700' },
  { value: 'negative', label: 'Negative', icon: '🚫', activeClass: 'bg-red-100 border-red-400 text-red-700' },
  { value: 'build_page', label: 'Build Page', icon: '📄', activeClass: 'bg-purple-100 border-purple-400 text-purple-700' },
  { value: 'new_campaign', label: 'New Campaign', icon: '🚀', activeClass: 'bg-amber-100 border-amber-400 text-amber-700' },
  { value: '', label: 'Unlabeled', icon: '⭕', activeClass: 'bg-slate-200 border-slate-400 text-slate-700' },
]

const filteredTerms = computed(() => {
  let list = terms.value
  if (filterLabel.value !== '') list = list.filter(t => (filterLabel.value === '' ? !t.label : t.label === filterLabel.value))
  if (filterSearch.value) list = list.filter(t => t.term.includes(filterSearch.value.toLowerCase()))
  return list
})

function countByLabel(label: string) {
  if (label === '') return terms.value.filter(t => !t.label).length
  return terms.value.filter(t => t.label === label).length
}

function labelClass(label: string) {
  const map: Record<string, string> = {
    keep: 'bg-green-100 text-green-700', watch: 'bg-blue-100 text-blue-700',
    negative: 'bg-red-100 text-red-700', build_page: 'bg-purple-100 text-purple-700',
    new_campaign: 'bg-amber-100 text-amber-700',
  }
  return map[label] ?? 'bg-slate-100 text-slate-500'
}

function labelIcon(label: string) {
  const map: Record<string, string> = {
    keep: '✅', watch: '👁', negative: '🚫', build_page: '📄', new_campaign: '🚀',
  }
  return map[label] ?? '⭕'
}

function applyLabel(term: SearchTerm, label: string) {
  term.label = label
}

function addToNegatives(term: string) {
  alert(`"${term}" queued to add as negative keyword. Go to Negative Keywords to apply.`)
}

async function runAILabel() {
  labeling.value = true
  aiLabelResult.value = null
  try {
    const unlabeled = terms.value.filter(t => !t.label)
    if (!unlabeled.length) { labeling.value = false; return }
    const result = await labelSearchTerms(unlabeled)
    if (result) {
      let applied = 0
      let high = 0
      for (const labeled of result) {
        const found = terms.value.find(t => t.term === labeled.term)
        if (found) {
          if (labeled.confidence === 'high') {
            found.label = labeled.suggested_label
            applied++
          }
          high++
        }
      }
      aiLabelResult.value = { high, applied }
    }
  }
  finally {
    labeling.value = false
  }
}

function addNewTerm() {
  if (!newTerm.term) return
  terms.value.push({ ...newTerm })
  Object.assign(newTerm, { term: '', campaign: '', impressions: 0, clicks: 0, cost: 0, conversions: 0, label: '' })
  showAddModal.value = false
}
</script>
