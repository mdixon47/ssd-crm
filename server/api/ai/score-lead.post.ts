import { z } from 'zod'
import type { Lead } from '~/types'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { runLeadScorerAgent } from '~/agents/LeadScorerAgent'

const schema = z.object({
  // .nullish(), not .optional(): the modal forwards the lead row straight
  // from Supabase, where empty columns come back as null, and zod's
  // .optional() rejects null — sparse leads (e.g. PhantomBuster imports)
  // would 400 before the agent ever ran.
  lead: z.object({
    fname: z.string().nullish(),
    lname: z.string().nullish(),
    email: z.string().nullish(),
    org: z.string().nullish(),
    title: z.string().nullish(),
    interest: z.string().nullish(),
    source: z.string().nullish(),
    campaign: z.string().nullish(),
    keyword: z.string().nullish(),
    notes: z.string().nullish(),
    stage: z.string().nullish(),
    qualified: z.string().nullish(),
    revenue: z.number().nullish(),
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
