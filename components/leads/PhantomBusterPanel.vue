<template>
  <div class="rounded-xl p-5 mb-5" style="background:#0d1628;border:1px solid rgba(10,102,194,0.35)">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="text-lg">🔎</span>
        <h2 class="font-semibold text-slate-100">LinkedIn Prospecting</h2>
        <span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:rgba(10,102,194,0.2);color:#6db6f5">PhantomBuster</span>
      </div>
      <button class="text-xs text-slate-500 hover:text-slate-300 transition-colors" @click="open = !open">
        {{ open ? '↑ Hide' : '↓ Show' }}
      </button>
    </div>

    <div v-if="open">
      <!-- Not configured -->
      <p v-if="checked && !configured" class="text-sm text-slate-400 leading-relaxed">
        Add <code class="text-cyan-300">PHANTOMBUSTER_API_KEY</code> to your .env (and Netlify env) to enable LinkedIn imports.
        Get a key at phantombuster.com → Workspace settings → API keys.
      </p>

      <!-- Configured -->
      <div v-else-if="configured" class="space-y-3">
        <div class="flex gap-3 flex-wrap items-end">
          <label class="text-xs text-slate-500">
            Phantom
            <select v-model="selectedId" class="block mt-1 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none w-64" style="background:#070c18;border:1px solid rgba(148,163,184,0.15)">
              <option v-for="p in phantoms" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </label>
          <label class="text-xs text-slate-500">
            Search keywords
            <input
              v-model="keywords"
              type="text"
              placeholder="e.g. nonprofit executive director"
              class="block mt-1 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 w-64 focus:outline-none"
              style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
            >
          </label>
          <label class="text-xs text-slate-500">
            Results
            <input
              v-model.number="numberOfResults"
              type="number" min="1" max="100"
              class="block mt-1 rounded-lg px-3 py-2 text-sm text-slate-200 w-20 focus:outline-none"
              style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
            >
          </label>
          <button
            class="text-xs font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50"
            style="background:rgba(10,102,194,0.25);border:1px solid rgba(10,102,194,0.5);color:#6db6f5"
            :disabled="busy || !selectedId"
            @click="launchAndImport"
          >
            {{ phase === 'launching' ? '⏳ Launching…' : phase === 'running' ? `⏳ Scraping… ${elapsed}s` : phase === 'importing' ? '⏳ Importing…' : '▶ Launch & Import' }}
          </button>
          <button
            class="text-xs font-semibold py-2 px-3 rounded-md transition-colors disabled:opacity-50 text-slate-300"
            style="border:1px solid rgba(148,163,184,0.2)"
            :disabled="busy || !selectedId"
            title="Import the results of this phantom's most recent finished run without launching a new one"
            @click="importLatest"
          >
            ↧ Import latest results
          </button>
        </div>

        <p v-if="statusMessage" class="text-sm" :class="statusIsError ? 'text-red-400' : 'text-slate-300'">{{ statusMessage }}</p>

        <div v-if="summary" class="text-sm text-slate-300 rounded-lg p-3" style="background:#080e1c;border:1px solid rgba(148,163,184,0.08)">
          <span class="text-emerald-400 font-semibold">{{ summary.imported }} imported</span>
          · {{ summary.duplicates }} duplicates skipped
          · {{ summary.skipped }} unusable rows
          <span v-if="summary.truncated" class="text-amber-400">· capped at 500 rows</span>
          <div v-if="summary.sample?.length" class="text-xs text-slate-500 mt-1">New: {{ summary.sample.join(', ') }}</div>
          <div v-if="summary.imported > 0" class="text-xs text-slate-500 mt-1">
            New leads enter the pipeline as “New Lead” — open one and use “AI Score This Lead” to qualify it.
          </div>
        </div>

        <p class="text-xs text-slate-600 italic">
          Runs use your connected LinkedIn account. Keep volumes small and infrequent — aggressive scraping can get the account restricted.
        </p>
      </div>

      <p v-else class="text-sm text-slate-500">Checking PhantomBuster…</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PhantomOption { id: string, name: string, lastEndStatus: string | null, lastEndMessage: string | null }
interface ImportSummary { imported: number, duplicates: number, skipped: number, truncated: boolean, sample?: string[], message?: string }

const emit = defineEmits<{ imported: [] }>()

const open = ref(true)
const checked = ref(false)
const configured = ref(false)
const phantoms = ref<PhantomOption[]>([])
const selectedId = ref('')
const keywords = ref('')
const numberOfResults = ref(10)

type Phase = 'idle' | 'launching' | 'running' | 'importing'
const phase = ref<Phase>('idle')
const busy = computed(() => phase.value !== 'idle')
const elapsed = ref(0)
const statusMessage = ref('')
const statusIsError = ref(false)
const summary = ref<ImportSummary | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null
function stopPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
}
onUnmounted(stopPolling)

onMounted(async () => {
  try {
    const res = await $fetch<{ configured: boolean, phantoms: PhantomOption[] }>('/api/phantombuster')
    configured.value = res.configured
    phantoms.value = res.phantoms
    if (res.phantoms.length) selectedId.value = res.phantoms[0].id
  }
  catch (e) {
    configured.value = false
    statusMessage.value = errText(e)
    statusIsError.value = true
  }
  finally {
    checked.value = true
  }
})

function errText(e: unknown): string {
  return (e as { data?: { message?: string } })?.data?.message
    ?? (e instanceof Error ? e.message : 'Request failed')
}

function setStatus(msg: string, isError = false) {
  statusMessage.value = msg
  statusIsError.value = isError
}

async function launchAndImport() {
  summary.value = null
  phase.value = 'launching'
  setStatus('Launching phantom…')
  try {
    const body: Record<string, unknown> = { agentId: selectedId.value }
    if (keywords.value.trim()) body.keywords = keywords.value.trim()
    if (numberOfResults.value) body.numberOfResults = numberOfResults.value
    const { containerId } = await $fetch<{ containerId: string }>('/api/phantombuster/launch', { method: 'POST', body })

    phase.value = 'running'
    elapsed.value = 0
    setStatus('Phantom is running — scraping LinkedIn…')

    // Poll run status every 5s, give up after 5 minutes. The scrape continues
    // on PhantomBuster either way; "Import latest results" picks it up later.
    stopPolling()
    pollTimer = setInterval(async () => {
      elapsed.value += 5
      if (elapsed.value > 300) {
        stopPolling()
        phase.value = 'idle'
        setStatus('Still running after 5 minutes — check PhantomBuster, then use “Import latest results”.', true)
        return
      }
      try {
        const c = await $fetch<{ finished: boolean, success: boolean, endType: string | null }>(
          `/api/phantombuster/containers/${containerId}`,
        )
        if (!c.finished) return
        stopPolling()
        if (!c.success) {
          phase.value = 'idle'
          setStatus('Run finished with errors — most often the phantom has no LinkedIn account connected. Check it in PhantomBuster.', true)
          return
        }
        await runImport({ containerId })
      }
      catch {
        // Transient poll failure — keep polling until the 5-minute cap.
      }
    }, 5000)
  }
  catch (e) {
    phase.value = 'idle'
    setStatus(errText(e), true)
  }
}

async function importLatest() {
  summary.value = null
  await runImport({ agentId: selectedId.value })
}

async function runImport(body: { containerId?: string, agentId?: string }) {
  phase.value = 'importing'
  setStatus('Importing results into the CRM…')
  try {
    const res = await $fetch<ImportSummary>('/api/phantombuster/import', { method: 'POST', body })
    summary.value = res
    setStatus(res.message ?? '')
    if (res.imported > 0) emit('imported')
  }
  catch (e) {
    setStatus(errText(e), true)
  }
  finally {
    phase.value = 'idle'
  }
}
</script>
