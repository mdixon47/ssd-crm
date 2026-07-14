import { createSupabaseClient } from '~/server/utils/supabase'
import { assertCanDelete } from '~/server/utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = createSupabaseClient()
  // Owner-or-admin + existence (404) — the service-role key bypasses RLS.
  await assertCanDelete(event, supabase, 'appointments', id)

  const { error } = await supabase.from('appointments').delete().eq('id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})
