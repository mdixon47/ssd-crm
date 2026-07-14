import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'
import { throwSingleRowError } from '~/server/utils/ownership'

const schema = z.object({
  service: z.string().min(1).max(200).optional(),
  value: z.number().min(0).max(9999999).optional(),
  signed_at: z.string().datetime().nullable().optional(),
  paid_at: z.string().datetime().nullable().optional(),
  payment_method: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('contracts')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) throwSingleRowError(error)
  return { data }
})
