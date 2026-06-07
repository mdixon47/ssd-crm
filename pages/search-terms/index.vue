<template>
  <div class="p-6 max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-cyan-400">Search Terms</h1>
        <p class="text-sm text-slate-500 mt-0.5">Label, triage, and act on Google Ads search queries</p>
      </div>
      <div class="flex gap-2">
        <button
          :disabled="labeling"
          class="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
          @click="runAILabel"
        >
          <span>✨</span>
          {{ labeling ? 'Labeling...' : 'AI Auto-Label' }}
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-slate-100 transition-colors"
          style="border:1px solid rgba(148,163,184,0.2)"
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
        :class="['text-sm px-3 py-1.5 rounded-full font-medium transition-colors', filterLabel === f.value ? f.activeClass : 'text-slate-400 hover:text-slate-200']"
        :style="filterLabel === f.value ? '' : 'background:rgba(148,163,184,0.06);border:1px solid rgba(148,163,184,0.12)'"
        @click="filterLabel = filterLabel === f.value ? '' : f.value"
      >
        {{ f.icon }} {{ f.label }}
        <span class="ml-1 opacity-60">({{ countByLabel(f.value) }})</span>
      </button>
      <input
        v-model="filterSearch"
        type="text"
        placeholder="Filter terms..."
        class="ml-auto rounded-full px-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none w-44"
        style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
      >
    </div>

    <!-- AI results banner -->
    <div v-if="aiLabelResult" class="mb-5 rounded-xl p-4" style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2)">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-emerald-400 font-bold text-sm">✅ AI labeled {{ aiLabelResult.high }} terms with high confidence, {{ aiLabelResult.applied }} applied automatically</span>
      </div>
      <p class="text-xs text-slate-400">Medium/low confidence terms are shown with suggestions — review and approve each one manually.</p>
    </div>

    <!-- Table -->
    <div class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead style="background:#080e1c;border-bottom:1px solid rgba(148,163,184,0.08)">
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
          <tbody class="divide-y divide-slate-700/30">
            <tr
              v-for="term in filteredTerms"
              :key="term.term"
              class="hover:bg-cyan-500/5 transition-colors"
            >
              <td class="px-4 py-3 font-medium text-slate-200">{{ term.term }}</td>
              <td class="px-4 py-3 text-slate-500 text-xs">{{ term.campaign }}</td>
              <td class="px-4 py-3 text-right text-slate-400">{{ term.impressions.toLocaleString() }}</td>
              <td class="px-4 py-3 text-right text-slate-400">{{ term.clicks }}</td>
              <td class="px-4 py-3 text-right font-semibold" :class="term.conversions > 0 ? 'text-emerald-400' : 'text-slate-600'">{{ term.conversions }}</td>
              <td class="px-4 py-3 text-right text-slate-400">${{ term.cost }}</td>
              <td class="px-4 py-3 text-center">
                <div v-if="editingLabel === term.term" class="flex gap-1 justify-center flex-wrap">
                  <button
                    v-for="l in LABELS"
                    :key="l.value"
                    :class="['text-xs px-2 py-0.5 rounded-full font-medium transition-colors', l.class]"
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
                  class="text-xs text-red-400 hover:underline font-medium"
                  @click="addToNegatives(term.term)"
                >
                  → Add Negative
                </button>
                <button
                  v-else
                  class="text-xs text-slate-500 hover:text-cyan-400 hover:underline transition-colors"
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
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(0,0,0,0.75)" @click.self="showAddModal = false">
      <div class="rounded-2xl w-full max-w-md p-6 shadow-2xl" style="background:#0d1628;border:1px solid rgba(6,182,212,0.15)">
        <h3 class="font-bold text-cyan-400 mb-4">Add Search Term</h3>
        <div class="space-y-3">
          <div>
            <label for="term-name" class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Search Term *</label>
            <input id="term-name" v-model="newTerm.term" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)">
          </div>
          <div>
            <label for="term-campaign" class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Campaign</label>
            <select id="term-campaign" v-model="newTerm.campaign" class="w-full rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)">
              <option v-for="c in GOOGLE_CAMPAIGNS" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div><label for="term-impr" class="text-xs font-semibold text-slate-500 block mb-1.5">Impressions</label><input id="term-impr" v-model.number="newTerm.impressions" type="number" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
            <div><label for="term-clicks" class="text-xs font-semibold text-slate-500 block mb-1.5">Clicks</label><input id="term-clicks" v-model.number="newTerm.clicks" type="number" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
            <div><label for="term-cost" class="text-xs font-semibold text-slate-500 block mb-1.5">Cost ($)</label><input id="term-cost" v-model.number="newTerm.cost" type="number" class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"></div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="px-4 py-2 rounded-lg text-sm text-slate-300 transition-colors" style="border:1px solid rgba(148,163,184,0.2)" @click="showAddModal = false">Cancel</button>
          <button class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition" @click="addNewTerm">Add Term</button>
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
  { value: 'keep', label: 'Keep', icon: '✅', class: 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25' },
  { value: 'watch', label: 'Watch', icon: '👁', class: 'bg-blue-500/15 border border-blue-500/30 text-blue-400 hover:bg-blue-500/25' },
  { value: 'negative', label: 'Negative', icon: '🚫', class: 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25' },
  { value: 'build_page', label: 'Build Page', icon: '📄', class: 'bg-purple-500/15 border border-purple-500/30 text-purple-400 hover:bg-purple-500/25' },
  { value: 'new_campaign', label: 'New Campaign', icon: '🚀', class: 'bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25' },
]

const LABEL_FILTERS = [
  { value: 'keep', label: 'Keep', icon: '✅', activeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' },
  { value: 'watch', label: 'Watch', icon: '👁', activeClass: 'bg-blue-500/20 text-blue-400 border border-blue-500/40' },
  { value: 'negative', label: 'Negative', icon: '🚫', activeClass: 'bg-red-500/20 text-red-400 border border-red-500/40' },
  { value: 'build_page', label: 'Build Page', icon: '📄', activeClass: 'bg-purple-500/20 text-purple-400 border border-purple-500/40' },
  { value: 'new_campaign', label: 'New Campaign', icon: '🚀', activeClass: 'bg-amber-500/20 text-amber-400 border border-amber-500/40' },
  { value: '', label: 'Unlabeled', icon: '⭕', activeClass: 'bg-slate-500/20 text-slate-300 border border-slate-500/40' },
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
    keep: 'bg-emerald-500/15 text-emerald-400', watch: 'bg-blue-500/15 text-blue-400',
    negative: 'bg-red-500/15 text-red-400', build_page: 'bg-purple-500/15 text-purple-400',
    new_campaign: 'bg-amber-500/15 text-amber-400',
  }
  return map[label] ?? 'bg-slate-500/15 text-slate-500'
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
