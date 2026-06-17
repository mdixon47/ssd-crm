// CRM Operations Agent endpoint
// Accepts a natural language message and optional conversation history.
// Runs the CRMOperationsAgent (Sonnet + tool_use loop) and returns
// the reply plus an action log of every tool the agent invoked.
import { z } from 'zod'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { runCRMOperationsAgent } from '~/agents/CRMOperationsAgent'

const schema = z.object({
  message: z.string().trim().min(1).max(4000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(12).optional(),
})

export default defineEventHandler(async (event) => {
  const raw = await readBody(event)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const { message, history = [] } = parsed.data

  const anthropic = getAnthropicClient()
  const supabase = createSupabaseClient()

  // Convert simple history format to Anthropic MessageParam format
  const messageHistory = history.map(h => ({
    role: h.role as 'user' | 'assistant',
    content: h.content,
  }))

  const result = await runCRMOperationsAgent(anthropic, supabase, message, messageHistory)

  return { data: result }
})
