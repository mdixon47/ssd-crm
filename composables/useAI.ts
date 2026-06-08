// ============================================================
// useAI — composable for invoking AI agents from the client
// All heavy lifting (Anthropic SDK, tool calls) happens
// server-side. This composable just manages client state
// and calls the appropriate server routes.
// ============================================================
import type { AuditReport, SearchTerm, Lead, EmailStrategyOutput, SocialStrategyOutput } from '~/types'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  loading?: boolean
}

export function useAI() {
  const messages = ref<AIMessage[]>([])
  const loading = ref(false)
  const lastReport = ref<AuditReport | null>(null)
  const lastEmailStrategy = ref<EmailStrategyOutput | null>(null)
  const lastSocialStrategy = ref<SocialStrategyOutput | null>(null)
  const error = ref<string | null>(null)

  // ── Chat / General ────────────────────────────────────────
  async function chat(userMessage: string): Promise<string> {
    messages.value.push({ role: 'user', content: userMessage, timestamp: new Date() })
    const placeholder: AIMessage = { role: 'assistant', content: '', timestamp: new Date(), loading: true }
    messages.value.push(placeholder)
    loading.value = true
    error.value = null

    // Build history excluding the placeholder and any other empty/loading messages
    const history = messages.value
      .slice(0, -1)
      .filter(m => !m.loading && m.content.trim().length > 0)
      .slice(-10)

    try {
      const res = await $fetch<{ data: { reply: string } }>('/api/ai/chat', {
        method: 'POST',
        body: { message: userMessage, history },
      })
      const reply = res.data.reply
      const idx = messages.value.length - 1
      messages.value[idx] = { role: 'assistant', content: reply, timestamp: new Date() }
      return reply
    }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'AI request failed'
      error.value = msg
      // Remove placeholder and orphaned user message
      messages.value.pop()
      messages.value.pop()
      return `Error: ${msg}`
    }
    finally {
      loading.value = false
    }
  }

  // ── Campaign Optimizer Agent ─────────────────────────────
  async function analyzeCampaigns(): Promise<Record<string, unknown> | null> {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: Record<string, unknown> }>('/api/ai/analyze-campaigns', {
        method: 'POST',
      })
      return res.data
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Campaign analysis failed'
      return null
    }
    finally {
      loading.value = false
    }
  }

  // ── Search Term Labeler Agent ────────────────────────────
  async function labelSearchTerms(terms: SearchTerm[]): Promise<Record<string, string> | null> {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: Record<string, string> }>('/api/ai/label-terms', {
        method: 'POST',
        body: { terms },
      })
      return res.data
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Term labeling failed'
      return null
    }
    finally {
      loading.value = false
    }
  }

  // ── Lead Scorer Agent ────────────────────────────────────
  async function scoreLead(lead: Partial<Lead>): Promise<{ score: number; reasoning: string } | null> {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: { score: number; reasoning: string } }>('/api/ai/score-lead', {
        method: 'POST',
        body: { lead },
      })
      return res.data
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Lead scoring failed'
      return null
    }
    finally {
      loading.value = false
    }
  }

  // ── Weekly Audit Agent ───────────────────────────────────
  async function runWeeklyAudit(): Promise<AuditReport | null> {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: AuditReport }>('/api/ai/weekly-audit', {
        method: 'POST',
      })
      lastReport.value = res.data
      return res.data
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Weekly audit failed'
      return null
    }
    finally {
      loading.value = false
    }
  }

  // ── Email Strategist Agent ───────────────────────────────
  async function runEmailStrategy(options?: { maxRecipients?: number, focus?: string }): Promise<EmailStrategyOutput | null> {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: EmailStrategyOutput }>('/api/ai/email-strategy', {
        method: 'POST',
        body: options ?? {},
      })
      lastEmailStrategy.value = res.data
      return res.data
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Email strategy failed'
      return null
    }
    finally {
      loading.value = false
    }
  }

  // ── Social Media Agent ───────────────────────────────────
  async function runSocialStrategy(platform: 'fb' | 'ig' | 'li'): Promise<SocialStrategyOutput | null> {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<{ data: SocialStrategyOutput }>('/api/ai/social-strategy', {
        method: 'POST',
        body: { platform },
      })
      lastSocialStrategy.value = res.data
      return res.data
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Social strategy failed'
      return null
    }
    finally {
      loading.value = false
    }
  }

  function clearMessages() {
    messages.value = []
  }

  return {
    messages,
    loading,
    lastReport,
    lastEmailStrategy,
    lastSocialStrategy,
    error,
    chat,
    analyzeCampaigns,
    labelSearchTerms,
    scoreLead,
    runWeeklyAudit,
    runEmailStrategy,
    runSocialStrategy,
    clearMessages,
  }
}
