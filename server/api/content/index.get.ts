import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const supabase = createSupabaseClient()

  let q = supabase
    .from('content_items')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Number(query.limit ?? 50))

  if (query.status) q = q.eq('status', query.status as string)
  if (query.platform) q = q.eq('platform', query.platform as string)
  if (query.offer) q = q.eq('offer', query.offer as string)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data }
})
