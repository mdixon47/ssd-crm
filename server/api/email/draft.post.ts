import { z } from 'zod'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { runEmailAgent } from '~/agents/EmailAgent'
import type { Lead } from '~/types'

const schema = z.object({
  lead: z.object({
    fname: z.string().optional(),
    lname: z.string().optional(),
    email: z.string().optional(),
    org: z.string().optional(),
    title: z.string().optional(),
    stage: z.string().optional(),
    interest: z.string().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
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
