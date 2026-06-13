import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing campaign id' })

  const supabase = createSupabaseClient()

  const [{ data: campaign, error: ce }, { data: recipients, error: re }] = await Promise.all([
    supabase.from('email_campaigns').select('*').eq('id', id).single(),
    supabase.from('email_campaign_recipients').select('*').eq('campaign_id', id).order('created_at'),
  ])

  if (ce) throw createError({ statusCode: ce.code === 'PGRST116' ? 404 : 500, message: ce.message })
  if (re) throw createError({ statusCode: 500, message: re.message })

  return { data: { ...campaign, recipients } }
})
