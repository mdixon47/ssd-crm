import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'
import { throwSingleRowError } from '~/server/utils/ownership'

// Publishing (is_active) stays a deliberate human action from the CRM.
const schema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  summary: z.string().trim().max(500).optional(),
  description: z.string().trim().max(8000).optional(),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  format: z.string().trim().max(160).optional(),
  price: z.number().nonnegative().max(1_000_000).nullable().optional(),
  is_active: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })
  if (Object.keys(parsed.data).length === 0) throw createError({ statusCode: 400, message: 'No valid fields to update' })

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('courses')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) throwSingleRowError(error)
  return { data }
})
