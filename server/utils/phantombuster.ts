// ============================================================
// PhantomBuster REST API v2 client + result-row → Lead mapping
// Docs: https://hub.phantombuster.com/reference
// Auth: workspace API key via the X-Phantombuster-Key header
// (PHANTOMBUSTER_API_KEY env → runtimeConfig.phantombusterApiKey).
// ============================================================

const PB_API_BASE = 'https://api.phantombuster.com/api/v2'

export function isPhantombusterConfigured(): boolean {
  return Boolean(useRuntimeConfig().phantombusterApiKey || process.env.PHANTOMBUSTER_API_KEY)
}

function pbKey(): string {
  const key = useRuntimeConfig().phantombusterApiKey || process.env.PHANTOMBUSTER_API_KEY
  if (!key) {
    throw new Error(
      'PHANTOMBUSTER_API_KEY is not set. Create one at https://phantombuster.com '
      + '(Workspace settings → API keys) and add it to your .env file.',
    )
  }
  return key
}

async function pbFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PB_API_BASE}${path}`, {
    ...init,
    headers: {
      'X-Phantombuster-Key': pbKey(),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    // Stay well under the Netlify 26s function wall (same rationale as anthropic.ts).
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`PhantomBuster API ${res.status} on ${path}: ${body.slice(0, 300)}`)
  }
  return await res.json() as T
}

// ── API surface ───────────────────────────────────────────────

export interface PhantomAgent {
  id: string | number
  name: string
  scriptId?: string | number | null
  argument?: string | Record<string, unknown> | null
  lastEndMessage?: string | null
  lastEndStatus?: string | null
}

export interface PhantomContainer {
  id: string | number
  agentId?: string | number
  status?: string | null // 'running' | 'finished'
  endType?: string | null // 'success' | 'error' | 'timeout' | ...
  exitCode?: number | null
  launchDate?: number | null
  endDate?: number | null
}

export function fetchPhantoms(): Promise<PhantomAgent[]> {
  return pbFetch<PhantomAgent[]>('/agents/fetch-all')
}

export function fetchPhantom(id: string): Promise<PhantomAgent> {
  return pbFetch<PhantomAgent>(`/agents/fetch?id=${encodeURIComponent(id)}`)
}

export async function launchPhantom(id: string, argument?: Record<string, unknown>): Promise<string> {
  const res = await pbFetch<{ containerId: string | number }>('/agents/launch', {
    method: 'POST',
    body: JSON.stringify(argument ? { id, argument } : { id }),
  })
  return String(res.containerId)
}

export function fetchContainer(id: string): Promise<PhantomContainer> {
  return pbFetch<PhantomContainer>(`/containers/fetch?id=${encodeURIComponent(id)}`)
}

export async function fetchContainersForAgent(agentId: string): Promise<PhantomContainer[]> {
  const res = await pbFetch<PhantomContainer[] | { containers?: PhantomContainer[] }>(
    `/containers/fetch-all?agentId=${encodeURIComponent(agentId)}`,
  )
  return Array.isArray(res) ? res : res.containers ?? []
}

// Returns the run's parsed result rows, or null when the run produced none.
export async function fetchResultRows(containerId: string): Promise<Record<string, unknown>[] | null> {
  const res = await pbFetch<{ resultObject?: string | null }>(
    `/containers/fetch-result-object?id=${encodeURIComponent(containerId)}`,
  )
  if (!res.resultObject) return null
  try {
    const parsed = JSON.parse(res.resultObject) as unknown
    if (Array.isArray(parsed)) return parsed as Record<string, unknown>[]
    // Some phantoms wrap rows in an object — accept common shapes.
    if (parsed && typeof parsed === 'object') return [parsed as Record<string, unknown>]
    return null
  }
  catch {
    return null
  }
}

// Merge launch-time overrides into the phantom's saved argument. PhantomBuster
// REPLACES the saved argument when one is passed at launch, so we must send the
// full merged object or the run would lose its identity/session configuration.
export function mergePhantomArgument(
  saved: string | Record<string, unknown> | null | undefined,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  let base: Record<string, unknown> = {}
  if (typeof saved === 'string') {
    try {
      base = JSON.parse(saved) as Record<string, unknown>
    }
    catch { /* corrupt saved argument — start clean */ }
  }
  else if (saved && typeof saved === 'object') {
    base = saved
  }
  return { ...base, ...overrides }
}

// ── Result-row mapping (pure — unit tested) ──────────────────

export interface MappedPhantomLead {
  fname: string
  lname: string
  email: string
  org: string
  title?: string
  keyword?: string
  linkedin_url?: string
  source: 'linkedin'
  stage: 'New Lead'
  qualified: ''
  revenue: 0
  notes: string
  lead_date: string
}

function pickStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

// Canonical dedupe key for a LinkedIn profile URL: host+path, no www/query/slash.
export function normalizeProfileUrl(url: string): string {
  try {
    const u = new URL(url)
    return (u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '')).toLowerCase()
  }
  catch {
    return url.trim().replace(/\/+$/, '').toLowerCase()
  }
}

// Maps one LinkedIn Search Export (or Profile Scraper) result row onto the CRM
// Lead shape. Field names vary across phantom versions, so each field probes a
// list of known aliases. Returns null for junk rows (no name and no profile).
export function mapPhantomRow(
  row: Record<string, unknown>,
  opts: { leadDate: string, phantomName?: string },
): MappedPhantomLead | null {
  const profileUrl = pickStr(row, ['profileUrl', 'linkedInProfileUrl', 'defaultProfileUrl', 'profileLink', 'url'])
  const fullName = pickStr(row, ['fullName', 'name'])
  let fname = pickStr(row, ['firstName', 'firstname', 'first_name'])
  let lname = pickStr(row, ['lastName', 'lastname', 'last_name'])
  if (!fname && fullName) {
    const parts = fullName.split(/\s+/)
    fname = parts[0] ?? ''
    lname = lname || parts.slice(1).join(' ')
  }
  if (!fname && !profileUrl) return null

  const title = pickStr(row, ['jobTitle', 'title', 'occupation', 'headline', 'job'])
  const org = pickStr(row, ['companyName', 'company', 'currentCompany', 'organization'])
  const email = pickStr(row, ['email', 'mail', 'professionalEmail', 'discoveredEmail']).toLowerCase()
  const location = pickStr(row, ['location', 'city'])
  const query = pickStr(row, ['query', 'searchQuery'])

  const noteLines = [
    `Imported from PhantomBuster${opts.phantomName ? ` — ${opts.phantomName}` : ''} on ${opts.leadDate}.`,
  ]
  if (location) noteLines.push(`Location: ${location}`)
  const headline = pickStr(row, ['headline'])
  if (headline && headline !== title) noteLines.push(`Headline: ${headline}`)

  return {
    fname: fname || 'Unknown',
    lname,
    email,
    org,
    title: title || undefined,
    keyword: query || undefined,
    linkedin_url: profileUrl || undefined,
    source: 'linkedin',
    stage: 'New Lead',
    qualified: '',
    revenue: 0,
    notes: noteLines.join('\n'),
    lead_date: opts.leadDate,
  }
}
