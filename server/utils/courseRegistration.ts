// Pure helpers for the public course registration workflow: payload
// validation, campaign attribution, and dashboard totals. The database
// work (lead match/create, registration, onboarding task) happens
// atomically in register_for_course() — see migration 013.
import { z } from 'zod'

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform(v => (v ? v : undefined))

export const RegistrationSchema = z.object({
  fname: z.string().trim().min(1).max(80),
  lname: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: optionalText(40),
  org: optionalText(160),
  // Honeypot — hidden from people, filled in by naive bots.
  website: z.string().max(500).optional(),
  attribution: z.object({
    utm_source: optionalText(120),
    utm_medium: optionalText(120),
    utm_campaign: optionalText(160),
    utm_term: optionalText(160),
    utm_content: optionalText(160),
    gclid: optionalText(512),
    fbclid: optionalText(512),
    li_fat_id: optionalText(512),
    landing: optionalText(512),
    referrer: optionalText(512),
  }).default({}),
})

export type RegistrationInput = z.infer<typeof RegistrationSchema>

// leads.source values the CRM already reports on (see leads/index.post.ts).
export type LeadSource = 'google' | 'facebook' | 'instagram' | 'linkedin' | 'email' | 'organic' | 'bark'

const SOURCE_ALIASES: Record<string, LeadSource> = {
  google: 'google', adwords: 'google', gads: 'google',
  facebook: 'facebook', fb: 'facebook', meta: 'facebook',
  instagram: 'instagram', ig: 'instagram',
  linkedin: 'linkedin', li: 'linkedin',
  email: 'email', newsletter: 'email', resend: 'email',
  bark: 'bark',
  organic: 'organic', direct: 'organic', website: 'organic',
}

// Best-effort mapping onto the CRM's source list. Click IDs win over a
// missing/unknown utm_source because they prove the ad platform.
export function inferLeadSource(a: RegistrationInput['attribution']): LeadSource | undefined {
  const raw = a.utm_source?.toLowerCase().replace(/[^a-z]/g, '')
  if (raw && SOURCE_ALIASES[raw]) return SOURCE_ALIASES[raw]
  if (a.gclid) return 'google'
  if (a.fbclid) return 'facebook'
  if (a.li_fat_id) return 'linkedin'
  if (!raw && !a.utm_medium && !a.utm_campaign) return 'organic'
  return undefined
}

// Shape passed as p_attribution to register_for_course().
export function toAttributionPayload(a: RegistrationInput['attribution']) {
  return {
    utm_source: a.utm_source,
    utm_medium: a.utm_medium,
    utm_campaign: a.utm_campaign,
    utm_term: a.utm_term,
    utm_content: a.utm_content,
    click_id: a.gclid ?? a.fbclid ?? a.li_fat_id,
    landing: a.landing,
    referrer: a.referrer,
    lead_source: inferLeadSource(a),
  }
}

export interface RegistrationRow {
  course_id: string
  utm_source: string | null
  created_at: string
}

export interface CourseTotals {
  course_id: string
  total: number
  last30Days: number
  bySource: { source: string, count: number }[]
}

// Registration totals per course, broken down by campaign source.
export function summarizeRegistrations(rows: RegistrationRow[], now = new Date()): CourseTotals[] {
  const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000
  const byCourse = new Map<string, { total: number, last30Days: number, sources: Map<string, number> }>()

  for (const r of rows) {
    const c = byCourse.get(r.course_id) ?? { total: 0, last30Days: 0, sources: new Map() }
    c.total++
    if (new Date(r.created_at).getTime() >= cutoff) c.last30Days++
    const source = r.utm_source?.trim().toLowerCase() || 'direct / unknown'
    c.sources.set(source, (c.sources.get(source) ?? 0) + 1)
    byCourse.set(r.course_id, c)
  }

  return [...byCourse.entries()].map(([course_id, c]) => ({
    course_id,
    total: c.total,
    last30Days: c.last30Days,
    bySource: [...c.sources.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
  }))
}
