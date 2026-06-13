import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'

const schema = z.object({
  outcome: z.enum(['scheduled', 'completed', 'no_show', 'rescheduled', 'cancelled']).optional(),
  notes: z.string().max(2000).optional(),
  packages_discussed: z.array(z.string()).optional(),
  next_step: z.string().max(500).optional(),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('sales_calls')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data }
})
