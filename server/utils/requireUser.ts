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
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    })
  }
  return user
}
