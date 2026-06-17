// Publishes content items whose scheduled_at has passed.
// Called by Netlify Scheduled Function or Vercel Cron on a 15-minute interval.
// Secured by cronSecret — exempt from session auth (see server/middleware/auth.ts).
//
// Netlify:  set NETLIFY_SCHEDULED_FUNCTION_CRON="*/15 * * * *" in dashboard
//           and point the scheduled function at /api/cron/publish-scheduled
// Vercel:   add { "path": "/api/cron/publish-scheduled", "schedule": "*/15 * * * *" }
//           to vercel.json `crons` array
//
// Manual:   GET /api/cron/publish-scheduled
//           Authorization: Bearer <NUXT_CRON_SECRET>
import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Validate cron secret — reject any caller that doesn't know it
  const authHeader = getHeader(event, 'authorization')
  if (!config.cronSecret || authHeader !== `Bearer ${config.cronSecret}`) {
    throw createError({ statusCode: 401, message: 'Invalid cron secret' })
  }

  const supabase = createSupabaseClient()
  const now = new Date().toISOString()

  // Find all items that are scheduled and past their publish time
  const { data: due, error: fetchError } = await supabase
    .from('content_items')
    .select('id, title, platform, scheduled_at')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)

  if (fetchError) throw createError({ statusCode: 500, message: fetchError.message })
  if (!due?.length) return { published: [], count: 0 }

  const ids = due.map(i => i.id)

  const { error: updateError } = await supabase
    .from('content_items')
    .update({ status: 'published', published_at: now })
    .in('id', ids)

  if (updateError) throw createError({ statusCode: 500, message: updateError.message })

  return { published: due, count: due.length }
})
