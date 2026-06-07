import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const supabase = createSupabaseClient()

  if (!id) throw createError({ statusCode: 400, message: 'Lead ID is required' })

  // Only allow updating safe fields
  const allowedFields = ['stage', 'qualified', 'revenue', 'notes', 'title', 'phone', 'interest']
  const update: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field]
  }

  if (Object.keys(update).length === 0) {
    throw createError({ statusCode: 400, message: 'No valid fields to update' })
  }

  const { data, error } = await supabase
    .from('leads')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data }
})
