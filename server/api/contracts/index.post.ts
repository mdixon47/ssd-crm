import { z } from 'zod'
import { requireUser } from '~/server/utils/requireUser'
import { createSupabaseClient } from '~/server/utils/supabase'

const schema = z.object({
  lead_id: z.string().uuid().nullable().optional(),
  service: z.string().min(1).max(200),
  value: z.number().min(0).max(9999999),
  signed_at: z.string().datetime().nullable().optional(),
  paid_at: z.string().datetime().nullable().optional(),
  payment_method: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('contracts')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data }
})
