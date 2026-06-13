import { z } from 'zod'
import { requireUser } from '~/server/utils/requireUser'
import { createSupabaseClient } from '~/server/utils/supabase'

const schema = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().int().min(5).max(480).default(60),
  type: z.enum(['consultation', 'sales_call', 'follow_up', 'other']).default('consultation'),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).default('scheduled'),
  notes: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('appointments')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data }
})
