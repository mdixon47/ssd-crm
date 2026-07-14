import { createSupabaseClient } from '~/server/utils/supabase'
import { assertCanDelete } from '~/server/utils/ownership'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = createSupabaseClient()
  // Owner-or-admin + existence (404) — the service-role key bypasses RLS.
  // Note: content generated via the CRM chat agent (A2A) has created_by = null,
  // so those drafts are deletable by admins only; UI-created content has an owner.
  await assertCanDelete(event, supabase, 'content_items', id)

  const { error } = await supabase.from('content_items').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data: { deleted: true } }
})
