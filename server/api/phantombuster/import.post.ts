import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'
import { requireUser } from '~/server/utils/requireUser'
import {
  fetchContainer,
  fetchContainersForAgent,
  fetchPhantom,
  fetchResultRows,
  mapPhantomRow,
  normalizeProfileUrl,
  type MappedPhantomLead,
} from '~/server/utils/phantombuster'

const ImportSchema = z.object({
  containerId: z.string().trim().regex(/^\d+$/).optional(),
  agentId: z.string().trim().regex(/^\d+$/).optional(),
}).refine(b => b.containerId || b.agentId, {
  message: 'Provide containerId or agentId',
})

// Bulk-insert cap per import call — keeps the request comfortably inside the
// Netlify 26s wall. Anything beyond is reported back as `truncated`.
const MAX_ROWS_PER_IMPORT = 500

// Is this Supabase error "the linkedin_url column doesn't exist yet"?
// (PGRST204 = PostgREST schema-cache miss, 42703 = Postgres undefined column.)
// Migration 012 adds the column; until it runs we fall back to notes.
function isMissingLinkedinColumn(error: { code?: string, message?: string } | null): boolean {
  if (!error) return false
  return (error.code === 'PGRST204' || error.code === '42703')
    && (error.message ?? '').includes('linkedin_url')
}

function stripLinkedinColumn(rows: (MappedPhantomLead & { created_by: string })[]) {
  return rows.map(({ linkedin_url, ...rest }) => ({
    ...rest,
    notes: linkedin_url ? `${rest.notes}\nLinkedIn: ${linkedin_url}` : rest.notes,
  }))
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const parsed = ImportSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid import payload',
      data: { issues: parsed.error.flatten() },
    })
  }

  // ── Resolve the run to import ─────────────────────────────
  let containerId = parsed.data.containerId
  let agentId = parsed.data.agentId
  try {
    if (!containerId) {
      const containers = await fetchContainersForAgent(agentId!)
      const done = containers.find(c => (c.status ? c.status !== 'running' : Boolean(c.endDate)))
      if (!done) {
        return { imported: 0, duplicates: 0, skipped: 0, truncated: false, message: 'No finished runs found for this phantom yet.' }
      }
      containerId = String(done.id)
    }
    else if (!agentId) {
      const container = await fetchContainer(containerId)
      if (container.agentId) agentId = String(container.agentId)
    }
  }
  catch (e) {
    throw createError({ statusCode: 502, message: e instanceof Error ? e.message : 'PhantomBuster request failed' })
  }

  // Phantom name is only cosmetic (import stamp in notes) — never fail on it.
  let phantomName: string | undefined
  if (agentId) {
    try {
      phantomName = (await fetchPhantom(agentId)).name
    }
    catch { /* cosmetic only */ }
  }

  // ── Fetch + map result rows ───────────────────────────────
  let rows: Record<string, unknown>[] | null
  try {
    rows = await fetchResultRows(containerId)
  }
  catch (e) {
    throw createError({ statusCode: 502, message: e instanceof Error ? e.message : 'PhantomBuster request failed' })
  }
  if (!rows || rows.length === 0) {
    return { imported: 0, duplicates: 0, skipped: 0, truncated: false, message: 'This run produced no results to import.' }
  }

  const truncated = rows.length > MAX_ROWS_PER_IMPORT
  if (truncated) rows = rows.slice(0, MAX_ROWS_PER_IMPORT)

  const leadDate = new Date().toISOString().slice(0, 10)
  const mapped: MappedPhantomLead[] = []
  let skipped = 0
  for (const row of rows) {
    const lead = mapPhantomRow(row, { leadDate, phantomName })
    if (lead) mapped.push(lead)
    else skipped++
  }

  // ── Dedupe: within the batch, then against existing leads ──
  const supabase = createSupabaseClient()
  const seenUrls = new Set<string>()
  const seenEmails = new Set<string>()

  let hasLinkedinColumn = true
  const existing = await supabase.from('leads').select('email, linkedin_url')
  if (isMissingLinkedinColumn(existing.error)) {
    hasLinkedinColumn = false
    // Pre-migration fallback: earlier imports stored the URL in notes.
    const legacy = await supabase.from('leads').select('email, notes')
    if (legacy.error) throw createError({ statusCode: 500, message: legacy.error.message })
    for (const l of legacy.data ?? []) {
      if (l.email) seenEmails.add(String(l.email).toLowerCase())
      const match = String(l.notes ?? '').match(/https?:\/\/[^\s)]*linkedin\.com\/[^\s)]+/i)
      if (match) seenUrls.add(normalizeProfileUrl(match[0]))
    }
  }
  else if (existing.error) {
    throw createError({ statusCode: 500, message: existing.error.message })
  }
  else {
    for (const l of existing.data ?? []) {
      if (l.email) seenEmails.add(String(l.email).toLowerCase())
      if (l.linkedin_url) seenUrls.add(normalizeProfileUrl(String(l.linkedin_url)))
    }
  }

  let duplicates = 0
  const toInsert: (MappedPhantomLead & { created_by: string })[] = []
  for (const lead of mapped) {
    const urlKey = lead.linkedin_url ? normalizeProfileUrl(lead.linkedin_url) : ''
    const emailKey = lead.email
    if ((urlKey && seenUrls.has(urlKey)) || (emailKey && seenEmails.has(emailKey))) {
      duplicates++
      continue
    }
    if (urlKey) seenUrls.add(urlKey)
    if (emailKey) seenEmails.add(emailKey)
    toInsert.push({ ...lead, created_by: user.id })
  }

  if (toInsert.length === 0) {
    return { imported: 0, duplicates, skipped, truncated, message: 'Nothing new — every result is already in the CRM.' }
  }

  // ── Insert (retry without linkedin_url if migration 012 hasn't run) ──
  const payload = hasLinkedinColumn ? toInsert : stripLinkedinColumn(toInsert)
  let inserted = await supabase.from('leads').insert(payload).select('id, fname, lname, org')
  if (hasLinkedinColumn && isMissingLinkedinColumn(inserted.error)) {
    inserted = await supabase.from('leads').insert(stripLinkedinColumn(toInsert)).select('id, fname, lname, org')
  }
  if (inserted.error) {
    throw createError({ statusCode: 500, message: inserted.error.message })
  }

  return {
    imported: inserted.data?.length ?? 0,
    duplicates,
    skipped,
    truncated,
    sample: (inserted.data ?? []).slice(0, 5).map(l => `${l.fname} ${l.lname}`.trim()),
  }
})
