import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'

const schema = z.object({
  stages: z.array(z.string()).default([]),
  sources: z.array(z.string()).default([]),
})

export default defineEventHandler(async (event) => {
  const raw = await readBody(event)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const { stages, sources } = parsed.data
  const supabase = createSupabaseClient()

  let query = supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .not('email', 'is', null)
    .neq('email', '')

  if (stages.length) query = query.in('stage', stages)
  if (sources.length) query = query.in('source', sources)

  const { count, error } = await query
  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data: { count: count ?? 0 } }
})
