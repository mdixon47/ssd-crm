import { z } from 'zod'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { runEmailAgent } from '~/agents/EmailAgent'
import type { Lead } from '~/types'

const schema = z.object({
  // .nullish(), not .optional(): callers forward lead rows straight from
  // Supabase, where empty text columns come back as null, and zod's
  // .optional() rejects null (the "/api/email/draft: 400" on sparse leads,
  // e.g. PhantomBuster imports with no interest/notes).
  lead: z.object({
    fname: z.string().nullish(),
    lname: z.string().nullish(),
    email: z.string().nullish(),
    org: z.string().nullish(),
    title: z.string().nullish(),
    stage: z.string().nullish(),
    interest: z.string().nullish(),
    source: z.string().nullish(),
    notes: z.string().nullish(),
  }),
  purpose: z.string().optional(),
  history: z
    .array(
      z.object({
        direction: z.enum(['outbound', 'inbound']),
        subject: z.string(),
        body: z.string(),
      }),
    )
    .optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const client = getAnthropicClient()
  const draft = await runEmailAgent(
    client,
    parsed.data.lead as Partial<Lead>,
    parsed.data.purpose,
    parsed.data.history,
  )

  return { data: { subject: draft.subject, body: draft.body } }
})
