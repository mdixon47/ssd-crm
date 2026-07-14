// AI-powered content creation — calls ContentPublishingAgent
// and returns saved content item IDs + strategy notes.
import { z } from 'zod'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { requireUser } from '~/server/utils/requireUser'
import { runContentPublishingAgent } from '~/agents/ContentPublishingAgent'

const schema = z.object({
  topic: z.string().trim().min(1).max(500),
  platform: z.enum(['linkedin', 'facebook', 'instagram', 'email', 'all']),
  offer: z.enum(['gw101', 'grants_consulting', 'bh_consulting', 'free_course', 'general']).optional(),
  tone: z.enum(['educational', 'promotional', 'testimonial', 'story', 'announcement']).optional(),
  context: z.string().max(1000).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const raw = await readBody(event)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const anthropic = getAnthropicClient()
  const supabase = createSupabaseClient()

  // Record the creator so they can later delete their own drafts (assertCanDelete).
  const result = await runContentPublishingAgent(anthropic, supabase, { ...parsed.data, createdBy: user.id })

  return { data: result }
})
