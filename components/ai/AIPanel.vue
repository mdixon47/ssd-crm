<template>
  <aside class="w-80 xl:w-96 flex flex-col flex-shrink-0" style="background:#0d1628;border-left:1px solid rgba(6,182,212,0.12)">
    <!-- Panel Header -->
    <div class="flex items-center justify-between px-4 py-3" style="background:#080e1c;border-bottom:1px solid rgba(148,163,184,0.08)">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-sm" style="background:rgba(6,182,212,0.15);border:1px solid rgba(6,182,212,0.3)">✨</div>
        <div>
          <div class="font-semibold text-sm text-slate-100">AI Assistant</div>
          <div class="text-xs text-slate-500">Powered by Claude</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="text-slate-500 hover:text-slate-300 text-xs transition-colors" @click="clearMessages">Clear</button>
        <button class="text-slate-500 hover:text-slate-200 text-lg leading-none transition-colors" @click="$emit('close')">×</button>
      </div>
    </div>

    <!-- Quick Actions -->
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
        <div class="text-3xl mb-3">🤖</div>
        <p class="font-medium text-slate-400 mb-1">Ask me anything about your campaigns</p>
        <p class="text-xs text-slate-600">Analyze ROAS · Score leads · Review search terms · Optimize budget</p>
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
    </div>

    <!-- AI Actions Bar -->
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
          placeholder="Ask about campaigns, leads, keywords..."
          class="flex-1 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-colors"
          style="background:#070c18;border:1px solid rgba(148,163,184,0.15)"
          @keydown.enter="sendMessage"
        >
        <button
          :disabled="!inputText.trim() || aiLoading"
          class="bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-xl transition-colors disabled:opacity-40 text-sm font-bold"
          @click="sendMessage"
        >
          →
        </button>
      </div>
      <p class="text-xs text-slate-600 mt-1.5 text-center">
        Recommendations only — all changes require human approval
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useAI } from '~/composables/useAI'

defineEmits<{ close: [] }>()

const { messages, loading: aiLoading, chat, analyzeCampaigns: runAnalysis, runWeeklyAudit, runEmailStrategy, runSocialStrategy, clearMessages } = useAI()

const inputText = ref('')
const agentLoading = ref(false)
const messagesEl = ref<HTMLElement>()

const quickActions = [
  { label: 'ROAS by campaign', prompt: 'What is the ROAS for each campaign?' },
  { label: 'Best leads this week', prompt: 'Which leads from this week look most promising?' },
  { label: 'Waste keywords', prompt: 'Which search terms are wasting budget?' },
  { label: 'Scale suggestions', prompt: 'Which campaigns should I consider scaling and why?' },
  { label: 'Negative KW gaps', prompt: 'What negative keywords am I missing?' },
]

async function sendMessage() {
  if (!inputText.value.trim() || aiLoading.value) return
  const msg = inputText.value.trim()
  inputText.value = ''
  await chat(msg)
  await nextTick()
  scrollToBottom()
}

async function sendQuickAction(prompt: string) {
  await chat(prompt)
  await nextTick()
  scrollToBottom()
}

async function runAudit() {
  agentLoading.value = true
  try {
    const report = await runWeeklyAudit()
    if (report) {
      await chat(`Weekly audit complete. Summary: ${report.summary}`)
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
      await chat(`Campaign analysis complete. ${result.summary as string}`)
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
      const headline = `Outreach plan ready — ${result.suggestions.length} suggested email${result.suggestions.length === 1 ? '' : 's'}.`
      const detail = result.suggestions.slice(0, 5).map(s => `• [${s.priority}] ${s.lead_name}${s.lead_org ? ` (${s.lead_org})` : ''} — ${s.reason}`).join('\n')
      await chat(`${headline}\n${detail}\n\n${result.summary}\n\nOpen the Leads page to review and send.`)
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
    // Default to Facebook from the panel; the social page has per-platform buttons.
    const result = await runSocialStrategy('fb')
    if (result) {
      const recs = result.recommendations.slice(0, 4).map(r => `• [${r.priority}] (${r.area}) ${r.action}`).join('\n')
      await chat(`Facebook strategy — health: **${result.health}**.\n${recs}\n\n${result.summary}\n\nOpen the Social page for per-platform breakdowns.`)
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
