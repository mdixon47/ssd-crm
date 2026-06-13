import { z } from 'zod'
import { requireUser } from '~/server/utils/requireUser'
import { createSupabaseClient } from '~/server/utils/supabase'

const schema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  recipient_filter: z.object({
    stages: z.array(z.string()).default([]),
    sources: z.array(z.string()).default([]),
  }).default({ stages: [], sources: [] }),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const raw = await readBody(event)
  const parsed = schema.safeParse(raw)

  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('email_campaigns')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { data }
})
