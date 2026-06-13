import { z } from 'zod'
import { requireUser } from '~/server/utils/requireUser'
import { createSupabaseClient } from '~/server/utils/supabase'

const schema = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().int().min(5).max(480).default(30),
  outcome: z.enum(['scheduled', 'completed', 'no_show', 'rescheduled', 'cancelled']).default('scheduled'),
  notes: z.string().max(2000).optional(),
  packages_discussed: z.array(z.string()).optional(),
  next_step: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('sales_calls')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data }
})
