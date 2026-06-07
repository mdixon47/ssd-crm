<template>
  <aside class="w-80 xl:w-96 bg-white border-l border-slate-200 flex flex-col shadow-xl flex-shrink-0">
    <!-- Panel Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-primary text-white">
      <div class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full bg-accent/80 flex items-center justify-center text-sm">✨</div>
        <div>
          <div class="font-semibold text-sm">AI Assistant</div>
          <div class="text-xs text-white/60">Powered by Claude</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="text-white/60 hover:text-white text-xs" @click="clearMessages">Clear</button>
        <button class="text-white/70 hover:text-white text-lg leading-none" @click="$emit('close')">×</button>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="px-3 py-2 border-b border-slate-100 flex flex-wrap gap-1.5">
      <button
        v-for="action in quickActions"
        :key="action.label"
        class="text-xs bg-slate-100 hover:bg-primary/10 text-slate-700 hover:text-primary px-2.5 py-1 rounded-full transition-colors font-medium"
        @click="sendQuickAction(action.prompt)"
      >
        {{ action.label }}
      </button>
    </div>

    <!-- Messages -->
    <div ref="messagesEl" class="flex-1 overflow-y-auto px-3 py-3 space-y-3">
      <div v-if="messages.length === 0" class="text-center text-slate-400 text-sm mt-8 px-4">
        <div class="text-3xl mb-3">🤖</div>
        <p class="font-medium text-slate-600 mb-1">Ask me anything about your campaigns</p>
        <p class="text-xs">Analyze ROAS · Score leads · Review search terms · Optimize budget</p>
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
              ? 'bg-primary text-white rounded-br-sm'
              : 'bg-slate-100 text-slate-800 rounded-bl-sm',
          ]"
        >
          <div v-if="msg.loading" class="flex gap-1 items-center py-1">
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0ms" />
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:150ms" />
            <span class="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style="animation-delay:300ms" />
          </div>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-else v-html="formatMessage(msg.content)" />
        </div>
      </div>
    </div>

    <!-- AI Actions Bar -->
    <div class="px-3 py-2 border-t border-slate-100 flex gap-2">
      <button
        :disabled="agentLoading"
        class="flex-1 text-xs bg-accent/10 hover:bg-accent/20 text-amber-700 font-semibold py-1.5 rounded-md transition-colors disabled:opacity-50"
        @click="runAudit"
      >
        {{ agentLoading ? '⏳ Running...' : '🔍 Run Weekly Audit' }}
      </button>
      <button
        :disabled="agentLoading"
        class="flex-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary font-semibold py-1.5 rounded-md transition-colors disabled:opacity-50"
        @click="analyzeCampaigns"
      >
        📊 Analyze Campaigns
      </button>
    </div>

    <!-- Input -->
    <div class="px-3 pb-3 pt-1.5">
      <div class="flex gap-2">
        <input
          v-model="inputText"
          type="text"
          placeholder="Ask about campaigns, leads, keywords..."
          class="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          @keydown.enter="sendMessage"
        >
        <button
          :disabled="!inputText.trim() || aiLoading"
          class="bg-primary hover:bg-primary-light text-white px-3.5 py-2 rounded-xl transition-colors disabled:opacity-40 text-sm"
          @click="sendMessage"
        >
          →
        </button>
      </div>
      <p class="text-xs text-slate-400 mt-1.5 text-center">
        Recommendations only — all changes require human approval
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useAI } from '~/composables/useAI'

defineEmits<{ close: [] }>()

const { messages, loading: aiLoading, chat, analyzeCampaigns: runAnalysis, runWeeklyAudit, clearMessages } = useAI()

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
