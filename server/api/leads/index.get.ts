import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const supabase = createSupabaseClient()

  let q = supabase.from('leads').select('*').order('created_at', { ascending: false })

  if (query.stage) q = q.eq('stage', query.stage as string)
  if (query.campaign) q = q.eq('campaign', query.campaign as string)
  if (query.source) q = q.eq('source', query.source as string)
  if (query.qualified) q = q.eq('qualified', query.qualified as string)
  if (query.limit) q = q.limit(Number(query.limit))

  const { data, error } = await q

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { data: data ?? [] }
})
