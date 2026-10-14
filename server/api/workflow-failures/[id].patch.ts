import { createSupabaseClient } from '~/server/utils/supabase'
import { requireUser } from '~/server/utils/requireUser'
import { throwSingleRowError } from '~/server/utils/ownership'

// Mark a failed submission / workflow action as reviewed.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing id' })

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('workflow_failures')
    .update({ resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('id', id)
    .select('id, resolved_at')
    .single()

  if (error) throwSingleRowError(error)
  return { data }
})
