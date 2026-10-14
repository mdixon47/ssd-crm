import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'
import { throwSingleRowError } from '~/server/utils/ownership'

const schema = z.object({
  status: z.enum(['open', 'done']).optional(),
  assignee: z.string().trim().max(120).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })
  if (Object.keys(parsed.data).length === 0) throw createError({ statusCode: 400, message: 'No valid fields to update' })

  const update: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.status) update.completed_at = parsed.data.status === 'done' ? new Date().toISOString() : null

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('tasks')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) throwSingleRowError(error)
  return { data }
})
