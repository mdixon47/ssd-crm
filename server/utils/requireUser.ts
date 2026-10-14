import type { H3Event } from 'h3'
import { createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

// Returns the authenticated Supabase user for `event`, or throws 401.
// Use at the top of any protected route handler:
//   const user = await requireUser(event)
// The shared server middleware (server/middleware/auth.ts) already
// applies this to every /api/** route, so handlers can also call
// `await getServerSession(event)` if they only need the email/id.
export async function requireUser(event: H3Event) {
  const claims = await serverSupabaseUser(event)
  if (!claims?.sub) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }
  // @nuxtjs/supabase v2 returns verified JWT claims, not a User object: the
  // user id is `sub`. Expose it as `id` so `created_by: user.id` and the
  // owner/admin checks in ownership.ts receive a real id (not undefined).
  return { ...claims, id: claims.sub, email: claims.email as string | undefined }
}
