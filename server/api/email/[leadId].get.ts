import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const leadId = getRouterParam(event, 'leadId')
  if (!leadId) throw createError({ statusCode: 400, message: 'leadId is required' })

  const supabase = createSupabaseClient()

  const { data, error } = await supabase
    .from('email_messages')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data: data ?? [] }
})
