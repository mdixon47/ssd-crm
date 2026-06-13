import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing campaign id' })

  const supabase = createSupabaseClient()

  const { data: campaign } = await supabase
    .from('email_campaigns')
    .select('status')
    .eq('id', id)
    .single()

  if (campaign && campaign.status !== 'draft') {
    throw createError({ statusCode: 409, message: 'Only draft campaigns can be deleted' })
  }

  const { error } = await supabase.from('email_campaigns').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data: { id } }
})
