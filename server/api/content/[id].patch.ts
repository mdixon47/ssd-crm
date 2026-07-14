import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'
import { throwSingleRowError } from '~/server/utils/ownership'

const ALLOWED = ['title', 'body', 'content_type', 'platform', 'status', 'scheduled_at',
  'topic', 'offer', 'tone', 'tags', 'performance'] as const

const schema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  body: z.string().trim().min(1).optional(),
  content_type: z.enum(['post', 'email', 'carousel', 'reel', 'article']).optional(),
  platform: z.enum(['linkedin', 'facebook', 'instagram', 'email', 'all']).optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  topic: z.string().max(300).nullable().optional(),
  offer: z.enum(['gw101', 'grants_consulting', 'bh_consulting', 'free_course', 'general']).nullable().optional(),
  tone: z.enum(['educational', 'promotional', 'testimonial', 'story', 'announcement']).nullable().optional(),
  tags: z.array(z.string()).optional(),
  performance: z.record(z.number()).optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const raw = await readBody(event)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message })

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (parsed.data[key] !== undefined) updates[key] = parsed.data[key]
  }

  // Auto-set published_at when status transitions to published
  if (updates.status === 'published') updates.published_at = new Date().toISOString()

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('content_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throwSingleRowError(error)
  return { data }
})
