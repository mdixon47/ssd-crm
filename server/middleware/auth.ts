import { requireUser } from '../utils/requireUser'

// Auth gate for every server route under /api/**.
//
// Runs ahead of route handlers. Returns 401 if no Supabase session
// cookie is present. Per-handler `await requireUser(event)` calls are
// still safe (idempotent) — keep them where a handler also needs the
// user object.
//
// Exempt paths:
// - /api/_supabase/*  — internal @nuxtjs/supabase v2 cookie sync
// - /api/cron/*       — secured by cronSecret Bearer token inside each handler
//
// A2A machine-to-machine:
// - /api/a2a/*  — if a valid `Authorization: Bearer <a2aSecret>` header is
//   present, skip session auth. Falls through to requireUser if not.
const EXEMPT_PREFIXES = ['/api/_supabase', '/api/cron']

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return
  if (EXEMPT_PREFIXES.some(p => path.startsWith(p))) return

  // Allow machine-to-machine A2A callers with valid Bearer token
  if (path.startsWith('/api/a2a/')) {
    const config = useRuntimeConfig()
    const authHeader = getHeader(event, 'authorization')
    if (config.a2aSecret && authHeader === `Bearer ${config.a2aSecret}`) return
  }

  await requireUser(event)
})
