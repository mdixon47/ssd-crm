import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = createSupabaseClient()
  const { error } = await supabase.from('appointments').delete().eq('id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})
