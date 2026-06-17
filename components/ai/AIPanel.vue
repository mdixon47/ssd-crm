<template>
  <aside class="w-80 xl:w-96 flex flex-col flex-shrink-0" style="background:#0d1628;border-left:1px solid rgba(6,182,212,0.12)">
    <!-- Panel Header -->
    <div class="flex items-center justify-between px-4 py-3" style="background:#080e1c;border-bottom:1px solid rgba(148,163,184,0.08)">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-sm" style="background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.3)">⚡</div>
        <div>
          <div class="font-semibold text-sm text-slate-100">CRM Operations Agent</div>
          <div class="text-xs text-slate-500">Powered by Claude Sonnet</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="text-slate-500 hover:text-slate-300 text-xs transition-colors" @click="clearMessages">Clear</button>
        <button class="text-slate-500 hover:text-slate-200 text-lg leading-none transition-colors" @click="$emit('close')">×</button>
      </div>
    </div>

    <!-- Quick Commands -->
    <div class="px-3 py-2 flex flex-wrap gap-1.5" style="border-bottom:1px solid rgba(148,163,184,0.06)">
      <button
        v-for="action in quickActions"
        :key="action.label"
        class="text-xs px-2.5 py-1 rounded-full transition-colors font-medium text-slate-400 hover:text-cyan-400"
        style="background:rgba(148,163,184,0.08);border:1px solid rgba(148,163,184,0.1)"
        @click="sendQuickAction(action.prompt)"
      >
        {{ action.label }}
      </button>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-3 py-3 space-y-3">
      <div v-if="messages.length === 0" class="text-center text-slate-500 text-sm mt-8 px-4">
        <div class="text-3xl mb-3">⚡</div>
        <p class="font-medium text-slate-400 mb-1">CRM Operations Agent</p>
        <p class="text-xs text-slate-600 leading-relaxed">
          Add leads · Draft follow-ups · Query by source or campaign<br>
          Schedule tasks · Analyze what's working
        </p>
      </div>

      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
      >
        <div
          :class="[
            'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
            msg.role === 'user'
              ? 'bg-cyan-600 text-white rounded-br-sm'
              : 'text-slate-200 rounded-bl-sm',
          ]"
          :style="msg.role !== 'user' ? 'background:rgba(148,163,184,0.08);border:1px solid rgba(148,163,184,0.1)' : ''"
        >
          <div v-if="msg.loading" class="flex gap-1 items-center py-1">
            <span class="w-1.5 h-1.5 rounded-full animate-bounce" style="background:rgba(6,182,212,0.6);animation-delay:0ms" />
            <span class="w-1.5 h-1.5 rounded-full animate-bounce" style="background:rgba(6,182,212,0.6);animation-delay:150ms" />
            <span class="w-1.5 h-1.5 rounded-full animate-bounce" style="background:rgba(6,182,212,0.6);animation-delay:300ms" />
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-else v-html="formatMessage(msg.content)" />
        </div>
      </div>

      <!-- Action log for last response -->
      <div v-if="lastActions.length > 0" class="flex flex-col gap-1 mt-1">
        <div
          v-for="(action, i) in lastActions"
          :key="i"
          class="text-xs px-2.5 py-1 rounded-md text-slate-500"
          style="background:rgba(6,182,212,0.04);border:1px solid rgba(6,182,212,0.1)"
        >
          <span class="text-cyan-600/70 font-mono mr-1">{{ toolLabel(action.tool) }}</span>
          {{ action.summary }}
        </div>
      </div>
    </div>

    <!-- Workflow Action Buttons -->
    <div class="px-3 py-2 grid grid-cols-2 gap-2" style="border-top:1px solid rgba(148,163,184,0.06);background:#080e1c">
      <button
        :disabled="agentLoading"
        class="text-xs font-semibold py-1.5 rounded-md transition-colors disabled:opacity-50 text-amber-400"
        style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2)"
        @click="runAudit"
      >
        {{ agentLoading ? '⏳ Running...' : '🔍 Weekly Audit' }}
      </button>
      <button
        :disabled="agentLoading"
        class="text-xs font-semibold py-1.5 rounded-md transition-colors disabled:opacity-50 text-cyan-400"
        style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.2)"
        @click="analyzeCampaigns"
      >
        📊 Analyze Campaigns
      </button>
      <button
        :disabled="agentLoading"
        class="text-xs font-semibold py-1.5 rounded-md transition-colors disabled:opacity-50 text-emerald-400"
        style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2)"
        @click="planEmails"
      >
        ✉️ Plan Outreach
      </button>
      <button
        :disabled="agentLoading"
        class="text-xs font-semibold py-1.5 rounded-md transition-colors disabled:opacity-50 text-purple-400"
        style="background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.2)"
        @click="planSocial"
      >
        📱 Social Strategy
      </button>
    </div>

    <!-- Input -->
    <div class="px-3 pb-3 pt-1.5">
      <div class="flex gap-2">
        <input
          v-model="inputText"
          type="text"
          placeholder='e.g. "Show me LinkedIn leads this week"'
          class="flex-1 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
          style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
          @keydown.enter="sendMessage"
        >
        <button
          :disabled="!inputText.trim() || loading"
          class="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-xl transition-colors disabled:opacity-40 text-sm font-bold"
          @click="sendMessage"
        >
          →
        </button>
      </div>
      <p class="text-xs text-slate-600 mt-1.5 text-center">
        Writes are real — email drafts need human review before sending
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { CRMActionLog } from '~/types'
import { useAI } from '~/composables/useAI'

defineEmits<{ close: [] }>()

const { messages, loading, crmChat, pushAssistantMessage, analyzeCampaigns: runAnalysis, runWeeklyAudit, runEmailStrategy, runSocialStrategy, clearMessages } = useAI()

const inputText = ref('')
const agentLoading = ref(false)
const messagesEl = ref<HTMLElement>()
const lastActions = ref<CRMActionLog[]>([])

const quickActions = [
  { label: 'New leads this week', prompt: 'Show me new leads from the last 7 days' },
  { label: 'LinkedIn leads', prompt: 'Show me leads from LinkedIn this week' },
  { label: 'Qualified — no proposal', prompt: 'Find qualified leads who have not received a proposal yet' },
  { label: 'Top campaign?', prompt: 'Which campaign generated the most qualified leads?' },
  { label: 'Summarize pipeline', prompt: 'Summarize the current lead pipeline by stage' },
  { label: 'Grant Writing 101 post', prompt: 'Create a LinkedIn post promoting Grant Writing 101' },
]

function toolLabel(tool: string): string {
  const map: Record<string, string> = {
    search_leads: '🔍',
    get_lead_detail: '👤',
    create_lead: '➕',
    update_lead: '✏️',
    draft_email: '✉️',
    get_campaign_performance: '📊',
    create_appointment: '📅',
    create_content: '✍️',
  }
  return map[tool] ?? '⚙️'
}

async function sendMessage() {
  if (!inputText.value.trim() || loading.value) return
  const msg = inputText.value.trim()
  inputText.value = ''
  lastActions.value = []
  const result = await crmChat(msg)
  if (result?.actions) lastActions.value = result.actions
  await nextTick()
  scrollToBottom()
}

async function sendQuickAction(prompt: string) {
  lastActions.value = []
  const result = await crmChat(prompt)
  if (result?.actions) lastActions.value = result.actions
  await nextTick()
  scrollToBottom()
}

async function runAudit() {
  agentLoading.value = true
  try {
    const report = await runWeeklyAudit()
    if (report) {
      lastActions.value = []
      pushAssistantMessage(`**Weekly Audit** — ${report.overall_health?.replace('_', ' ') ?? 'complete'}\n\n${report.summary}\n\nScale: ${(report.campaigns_to_scale ?? []).join(', ') || 'none'} · Pause: ${(report.campaigns_to_pause ?? []).join(', ') || 'none'}\n\nOpen the Weekly Audit page for the full checklist.`)
      await nextTick()
      scrollToBottom()
    }
  }
  finally {
    agentLoading.value = false
  }
}

async function analyzeCampaigns() {
  agentLoading.value = true
  try {
    const result = await runAnalysis()
    if (result && result.summary) {
      lastActions.value = []
      pushAssistantMessage(`**Campaign Analysis**\n\n${result.summary as string}\n\nOpen the Campaigns page for full keyword and spend breakdown.`)
      await nextTick()
      scrollToBottom()
    }
  }
  finally {
    agentLoading.value = false
  }
}

async function planEmails() {
  agentLoading.value = true
  try {
    const result = await runEmailStrategy()
    if (result) {
      const headline = `**Outreach Plan** — ${result.suggestions.length} suggested email${result.suggestions.length === 1 ? '' : 's'}`
      const detail = result.suggestions.slice(0, 5).map(s => `• [${s.priority}] ${s.lead_name}${s.lead_org ? ` (${s.lead_org})` : ''} — ${s.reason}`).join('\n')
      lastActions.value = []
      pushAssistantMessage(`${headline}\n\n${detail}\n\n${result.summary}\n\nOpen the Leads page to review drafts and send.`)
      await nextTick()
      scrollToBottom()
    }
  }
  finally {
    agentLoading.value = false
  }
}

async function planSocial() {
  agentLoading.value = true
  try {
    const result = await runSocialStrategy('fb')
    if (result) {
      const recs = result.recommendations.slice(0, 4).map(r => `• [${r.priority}] (${r.area}) ${r.action}`).join('\n')
      lastActions.value = []
      pushAssistantMessage(`**Facebook Strategy** — health: **${result.health}**\n\n${recs}\n\n${result.summary}\n\nOpen the Social page for per-platform analysis.`)
      await nextTick()
      scrollToBottom()
    }
  }
  finally {
    agentLoading.value = false
  }
}

function scrollToBottom() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

function formatMessage(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
    .replace(/- (.*?)(<br>|$)/g, '• $1$2')
}
</script>
