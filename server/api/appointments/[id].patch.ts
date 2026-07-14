import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'
import { throwSingleRowError } from '~/server/utils/ownership'

const schema = z.object({
  title: z.string().min(1).max(200).optional(),
  scheduled_at: z.string().datetime().optional(),
  duration_minutes: z.number().int().min(5).max(480).optional(),
  type: z.enum(['consultation', 'sales_call', 'follow_up', 'other']).optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  notes: z.string().max(2000).optional(),
  location: z.string().max(500).optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('appointments')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) throwSingleRowError(error)
  return { data }
})
