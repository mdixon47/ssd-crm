import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'

const schema = z.object({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1),
  content_type: z.enum(['post', 'email', 'carousel', 'reel', 'article']),
  platform: z.enum(['linkedin', 'facebook', 'instagram', 'email', 'all']),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional().default('draft'),
  scheduled_at: z.string().datetime().optional().nullable(),
  topic: z.string().max(300).optional().nullable(),
  offer: z.enum(['gw101', 'grants_consulting', 'bh_consulting', 'free_course', 'general']).optional().nullable(),
  tone: z.enum(['educational', 'promotional', 'testimonial', 'story', 'announcement']).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
})

export default defineEventHandler(async (event) => {
  const raw = await readBody(event)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('content_items')
    .insert({ ...parsed.data, performance: {} })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { data }
})
