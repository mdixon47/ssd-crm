<template>
  <div class="space-y-4">
    <!-- Compose form -->
    <div class="rounded-xl p-4 space-y-3" style="background:#111d35;border:1px solid rgba(148,163,184,0.1)">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-semibold text-slate-300">New Email</h4>
        <button
          class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-40"
          :disabled="drafting"
          @click="generateDraft"
        >
          <span v-if="drafting">Drafting...</span>
          <span v-else>✨ AI Draft</span>
        </button>
      </div>

      <div>
        <label for="email-to" class="text-xs font-semibold text-slate-500 uppercase block mb-1">To</label>
        <input
          id="email-to"
          v-model="form.to"
          type="email"
          class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none"
          style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
        >
      </div>

      <div>
        <label for="email-subject" class="text-xs font-semibold text-slate-500 uppercase block mb-1">Subject</label>
        <input
          id="email-subject"
          v-model="form.subject"
          type="text"
          placeholder="Email subject…"
          class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
          style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
        >
      </div>

      <div>
        <label for="email-body" class="text-xs font-semibold text-slate-500 uppercase block mb-1">Message</label>
        <textarea
          id="email-body"
          v-model="form.body"
          rows="7"
          placeholder="Write your message…"
          class="w-full rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none resize-none font-mono"
          style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
        />
      </div>

      <div v-if="draftPurposeVisible" class="flex gap-2">
        <input
          v-model="draftPurpose"
          type="text"
          placeholder="E.g. follow up on consultation, send proposal…"
          class="flex-1 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none"
          style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
          @keydown.enter="generateDraft"
        >
        <button
          class="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          style="border:1px solid rgba(148,163,184,0.15)"
          @click="draftPurposeVisible = false"
        >
          Cancel
        </button>
      </div>

      <div v-if="sendError" class="text-xs text-red-400 rounded-lg px-3 py-2" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2)">
        {{ sendError }}
      </div>

      <div class="flex justify-between items-center pt-1">
        <button
          class="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
          @click="draftPurposeVisible = !draftPurposeVisible"
        >
          {{ draftPurposeVisible ? 'Hide purpose' : 'Set AI purpose' }}
        </button>
        <button
          class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
          :disabled="sending || !canSend"
          @click="send"
        >
          {{ sending ? 'Sending…' : 'Send Email' }}
        </button>
      </div>
    </div>

    <!-- Sent history -->
    <div v-if="history.length > 0" class="space-y-2">
      <h4 class="text-xs font-semibold text-slate-500 uppercase">Sent History</h4>
      <div
        v-for="msg in history"
        :key="msg.id"
        class="rounded-xl p-3 text-sm"
        style="border:1px solid rgba(148,163,184,0.08);background:#080e1c"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="font-medium text-slate-300 truncate pr-2">{{ msg.subject }}</span>
          <span
            class="text-xs shrink-0 px-2 py-0.5 rounded-full font-medium"
            :class="msg.status === 'sent' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'"
          >
            {{ msg.status }}
          </span>
        </div>
        <p class="text-xs text-slate-500">{{ formatDate(msg.created_at) }}</p>
        <p class="text-xs text-slate-500 mt-1 line-clamp-2 whitespace-pre-wrap">{{ msg.body }}</p>
      </div>
    </div>

    <div v-else-if="!loadingHistory" class="text-sm text-slate-600 text-center py-4">
      No emails sent yet.
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Lead, EmailMessage } from '~/types'

const props = defineProps<{ lead: Lead }>()

const form = reactive({
  to: props.lead.email,
  subject: '',
  body: '',
})

const drafting = ref(false)
const sending = ref(false)
const sendError = ref<string | null>(null)
const draftPurpose = ref('')
const draftPurposeVisible = ref(false)
const history = ref<EmailMessage[]>([])
const loadingHistory = ref(true)

const canSend = computed(
  () => form.to && form.subject.trim() && form.body.trim(),
)

async function generateDraft() {
  drafting.value = true
  sendError.value = null
  try {
    const res = await $fetch<{ data: { subject: string; body: string } }>('/api/email/draft', {
      method: 'POST',
      body: {
        lead: {
          fname: props.lead.fname,
          lname: props.lead.lname,
          email: props.lead.email,
          org: props.lead.org,
          title: props.lead.title,
          stage: props.lead.stage,
          interest: props.lead.interest,
          source: props.lead.source,
          notes: props.lead.notes,
        },
        purpose: draftPurpose.value || undefined,
      },
    })
    form.subject = res.data.subject
    form.body = res.data.body
    draftPurposeVisible.value = false
  }
  catch (e: unknown) {
    sendError.value = e instanceof Error ? e.message : 'AI draft failed'
  }
  finally {
    drafting.value = false
  }
}

async function send() {
  if (!canSend.value) return
  sending.value = true
  sendError.value = null
  try {
    await $fetch('/api/email/send', {
      method: 'POST',
      body: {
        leadId: props.lead.id,
        to: form.to,
        subject: form.subject,
        body: form.body,
      },
    })
    form.subject = ''
    form.body = ''
    await loadHistory()
  }
  catch (e: unknown) {
    sendError.value = e instanceof Error ? e.message : 'Send failed'
  }
  finally {
    sending.value = false
  }
}

async function loadHistory() {
  loadingHistory.value = true
  try {
    const res = await $fetch<{ data: EmailMessage[] }>(`/api/email/${props.lead.id}`)
    history.value = res.data
  }
  catch {
    // silently fail — history is non-critical
  }
  finally {
    loadingHistory.value = false
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

onMounted(loadHistory)
</script>
