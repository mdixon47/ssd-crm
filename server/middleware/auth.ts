import { requireUser } from '../utils/requireUser'

// Auth gate for every server route under /api/**.
//
// Runs ahead of route handlers. Returns 401 if no Supabase session
// cookie is present. Per-handler `await requireUser(event)` calls are
// still safe (idempotent) — keep them where a handler also needs the
// user object.
//
// Exempt paths:
// - /api/_supabase/*  — used internally by @nuxtjs/supabase v2 for
//   cookie sync; must be reachable without an existing session.
// - /api/health (if added later) — explicit allowlist below.
const EXEMPT_PREFIXES = ['/api/_supabase']

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return
  if (EXEMPT_PREFIXES.some(p => path.startsWith(p))) return

  await requireUser(event)
})
