import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async () => {
  const supabase = createSupabaseClient()

  const { data, error } = await supabase
    .from('email_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { data }
})
