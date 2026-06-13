<template>
  <!-- Backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(6,12,24,0.85)" @click.self="$emit('close')">
    <div class="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden" style="background:#0b1120;border:1px solid rgba(148,163,184,0.15)">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 flex-shrink-0" style="border-bottom:1px solid rgba(148,163,184,0.08)">
        <h2 class="text-base font-bold text-slate-100">New Email Campaign</h2>
        <button class="text-slate-500 hover:text-slate-300 transition-colors" @click="$emit('close')">✕</button>
      </div>

      <!-- Scrollable body -->
      <div class="overflow-y-auto flex-1 p-6 space-y-5">

        <!-- Name -->
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Campaign Name <span class="text-rose-400">*</span></label>
          <input
            v-model="form.name"
            type="text"
            placeholder="e.g. June Newsletter, Grant Writing Follow-up"
            class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
          >
        </div>

        <!-- Subject -->
        <div>
          <label class="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Subject Line <span class="text-rose-400">*</span></label>
          <input
            v-model="form.subject"
            type="text"
            placeholder="e.g. Quick update from SSD Consulting, {{first_name}}"
            class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
          >
        </div>

        <!-- Body -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-semibold text-slate-500 uppercase">Message Body <span class="text-rose-400">*</span></label>
            <span class="text-xs text-slate-600">Merge tags: <code class="text-cyan-600">&#123;&#123;first_name&#125;&#125;</code> <code class="text-cyan-600">&#123;&#123;org&#125;&#125;</code> <code class="text-cyan-600">&#123;&#123;full_name&#125;&#125;</code></span>
          </div>
          <textarea
            v-model="form.body"
            rows="10"
            placeholder="Hi {{first_name}},&#10;&#10;I wanted to reach out about..."
            class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none font-mono leading-relaxed"
            style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
          />
        </div>

        <!-- Recipients -->
        <div class="rounded-xl p-4 space-y-4" style="background:#080e1c;border:1px solid rgba(148,163,184,0.08)">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Recipients</div>

          <!-- Stage filter -->
          <div>
            <div class="text-xs text-slate-500 mb-2 font-medium">Filter by Stage <span class="text-slate-600">(leave all unchecked = all stages)</span></div>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="stage in STAGES"
                :key="stage"
                class="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors select-none"
                :style="form.stages.includes(stage)
                  ? 'background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.4);color:#67e8f9'
                  : 'background:#0d1628;border:1px solid rgba(148,163,184,0.12);color:#94a3b8'"
              >
                <input v-model="form.stages" type="checkbox" :value="stage" class="sr-only">
                {{ stage }}
              </label>
            </div>
          </div>

          <!-- Source filter -->
          <div>
            <div class="text-xs text-slate-500 mb-2 font-medium">Filter by Source <span class="text-slate-600">(leave all unchecked = all sources)</span></div>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="src in SOURCES"
                :key="src.value"
                class="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors select-none"
                :style="form.sources.includes(src.value)
                  ? 'background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.4);color:#67e8f9'
                  : 'background:#0d1628;border:1px solid rgba(148,163,184,0.12);color:#94a3b8'"
              >
                <input v-model="form.sources" type="checkbox" :value="src.value" class="sr-only">
                {{ src.label }}
              </label>
            </div>
          </div>

          <!-- Preview count -->
          <div class="flex items-center gap-3 pt-1">
            <button
              class="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              style="background:rgba(148,163,184,0.08);border:1px solid rgba(148,163,184,0.15);color:#94a3b8"
              :disabled="previewing"
              @click="fetchPreview"
            >
              {{ previewing ? 'Counting…' : '↻ Preview recipients' }}
            </button>
            <span v-if="previewCount !== null" class="text-sm font-semibold" :class="previewCount > 0 ? 'text-cyan-400' : 'text-amber-400'">
              {{ previewCount }} lead{{ previewCount === 1 ? '' : 's' }} will receive this email
            </span>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="text-xs text-rose-400 rounded-lg px-3 py-2.5" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2)">
          {{ error }}
        </div>

      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between gap-3 px-6 py-4 flex-shrink-0" style="border-top:1px solid rgba(148,163,184,0.08)">
        <button
          class="text-sm px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          style="border:1px solid rgba(148,163,184,0.15)"
          :disabled="saving"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <div class="flex gap-2">
          <button
            class="text-sm px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            style="background:rgba(148,163,184,0.08);border:1px solid rgba(148,163,184,0.2);color:#94a3b8"
            :disabled="!canSubmit || saving"
            @click="submit('draft')"
          >
            {{ saving === 'draft' ? 'Saving…' : 'Save Draft' }}
          </button>
          <button
            class="text-sm px-5 py-2 rounded-lg font-semibold text-cyan-300 transition-all disabled:opacity-50"
            style="background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.3)"
            :disabled="!canSubmit || saving"
            @click="submit('send')"
          >
            {{ saving === 'send' ? 'Sending…' : 'Save & Send' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { EmailCampaign } from '~/types'

const emit = defineEmits<{
  close: []
  saved: [campaign: EmailCampaign]
  sent: [campaign: EmailCampaign, result: { sent: number; failed: number; total: number }]
}>()

const STAGES = [
  'New Lead', 'Contacted', 'Booked Consultation', 'Qualified',
  'Proposal Sent', 'Purchased Course', 'Became Consulting Client',
]

const SOURCES = [
  { value: 'google', label: 'Google' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
  { value: 'organic', label: 'Organic' },
]

const form = reactive({
  name: '',
  subject: '',
  body: '',
  stages: [] as string[],
  sources: [] as string[],
})

const previewing = ref(false)
const previewCount = ref<number | null>(null)
const saving = ref<'draft' | 'send' | false>(false)
const error = ref<string | null>(null)

const canSubmit = computed(() => form.name.trim() && form.subject.trim() && form.body.trim())

async function fetchPreview() {
  previewing.value = true
  try {
    const res = await $fetch<{ data: { count: number } }>('/api/email-campaigns/preview', {
      method: 'POST',
      body: { stages: form.stages, sources: form.sources },
    })
    previewCount.value = res.data.count
  }
  catch (e: unknown) {
    previewCount.value = null
    error.value = e instanceof Error ? e.message : 'Preview failed'
  }
  finally {
    previewing.value = false
  }
}

async function submit(mode: 'draft' | 'send') {
  if (!canSubmit.value) return
  saving.value = mode
  error.value = null

  try {
    const created = await $fetch<{ data: EmailCampaign }>('/api/email-campaigns', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        subject: form.subject.trim(),
        body: form.body.trim(),
        recipient_filter: { stages: form.stages, sources: form.sources },
      },
    })

    if (mode === 'draft') {
      emit('saved', created.data)
      return
    }

    const result = await $fetch<{ data: { sent: number; failed: number; total: number } }>(
      `/api/email-campaigns/${created.data.id}/send`,
      { method: 'POST' },
    )
    emit('sent', created.data, result.data)
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Something went wrong'
  }
  finally {
    saving.value = false
  }
}
</script>
