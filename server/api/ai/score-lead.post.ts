import { z } from 'zod'
import type { Lead } from '~/types'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { runLeadScorerAgent } from '~/agents/LeadScorerAgent'

const schema = z.object({
  lead: z.object({
    fname: z.string().optional(),
    lname: z.string().optional(),
    email: z.string().optional(),
    org: z.string().optional(),
    title: z.string().optional(),
    interest: z.string().optional(),
    source: z.string().optional(),
    campaign: z.string().optional(),
    keyword: z.string().optional(),
    notes: z.string().optional(),
    stage: z.string().optional(),
    qualified: z.string().optional(),
    revenue: z.number().optional(),
  }),
})

export default defineEventHandler(async (event) => {
  const raw = await readBody(event)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const client = getAnthropicClient()
  const result = await runLeadScorerAgent(client, parsed.data.lead as Partial<Lead>)
  return { data: result }
})
