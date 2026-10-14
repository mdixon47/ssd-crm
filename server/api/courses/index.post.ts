import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'
import { requireUser } from '~/server/utils/requireUser'

const schema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(500).optional(),
  description: z.string().trim().max(8000).optional(),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  format: z.string().trim().max(160).optional(),
  price: z.number().nonnegative().max(1_000_000).optional(),
  // Courses start unpublished; activating one makes its landing page live.
  is_active: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('courses')
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error?.code === '23505') throw createError({ statusCode: 409, message: 'A course with that slug already exists' })
  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data }
})
