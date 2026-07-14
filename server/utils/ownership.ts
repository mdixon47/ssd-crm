import type { H3Event } from 'h3'
import { createError } from 'h3'
import { requireUser } from './requireUser'
import type { createSupabaseClient } from './supabase'

type SupabaseClient = ReturnType<typeof createSupabaseClient>

// The server talks to Supabase with the service-role key (server/utils/supabase.ts),
// which BYPASSES Row Level Security. The multi-user rules in migrations 007/010
// (shared read/update, owner-scoped insert, owner-or-admin delete) therefore have
// to be reproduced here on the API path, or they protect nothing. These helpers do
// that.

/** True if the authenticated user has a row in admin_users. */
export async function isAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  return Boolean(data)
}

/**
 * Enforce the shared-team DELETE rule (migrations 007/010): a row may be deleted
 * only by its creator or by an admin. Throws:
 *   - 404 if the row does not exist,
 *   - 403 if the caller is neither the owner nor an admin.
 * Rows with created_by = null (e.g. legacy rows, or content created by a
 * service-role agent) are deletable by admins only.
 */
export async function assertCanDelete(
  event: H3Event,
  supabase: SupabaseClient,
  table: string,
  id: string,
): Promise<void> {
  const user = await requireUser(event)

  const { data: row, error } = await supabase
    .from(table)
    .select('created_by')
    .eq('id', id)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!row) throw createError({ statusCode: 404, message: 'Not found' })

  if (row.created_by && row.created_by === user.id) return
  if (await isAdmin(supabase, user.id)) return

  throw createError({ statusCode: 403, message: 'You can only delete records you created.' })
}

/**
 * Map a PostgREST single-row result error to the right HTTP status:
 * PGRST116 ("0 rows") → 404, anything else → 500. Use after a `.single()`
 * update so a mutation on a non-existent id returns 404 instead of an opaque 500.
 */
export function throwSingleRowError(error: { code?: string, message: string }): never {
  if (error.code === 'PGRST116') {
    throw createError({ statusCode: 404, message: 'Not found' })
  }
  throw createError({ statusCode: 500, message: error.message })
}
