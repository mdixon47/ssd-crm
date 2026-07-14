// ============================================================
// Lead Extractor Agent
// Extracts structured lead fields from a pasted email body
// (Bark notification, contact-form forward, manual referral, …).
// The caller is expected to preview the result before saving.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { LeadSource } from '~/types'
import { CLAUDE_HAIKU } from '~/lib/models'

export interface ExtractedLead {
  fname: string
  lname: string
  email: string
  phone?: string
  org: string
  title?: string
  interest?: string
  source: LeadSource
  notes?: string
  warnings: string[]
  model_used: string
}

const SYSTEM_PROMPT = `You extract a single sales lead from a raw email body.

Common formats include:
- Bark.com lead notifications ("[Bark] New lead — Grant writing in Atlanta")
- Website contact-form forwards
- Manual referrals from a colleague

Rules:
- Return ONLY valid JSON. No prose, no markdown fences.
- If a field is not stated, use an empty string (""). Never invent values.
- "org" should be the lead's organization, NOT the platform (e.g. NOT "Bark.com").
- If you cannot find a first/last name, split a single full name on the first space.
- "notes" should contain the raw lead context (project description, budget, location)
  that doesn't fit other fields. Keep it under 600 characters.
- Add a "warnings" array describing any fields you could not extract confidently.

Source inference:
- If the email is from "bark.com" or mentions Bark, source = "bark".
- If it's a website contact form / form submission, source = "organic".
- Otherwise source = "email".`

export async function runLeadExtractorAgent(
  client: Anthropic,
  rawText: string,
  sourceHint?: LeadSource,
): Promise<ExtractedLead> {
  const modelUsed = CLAUDE_HAIKU

  const response = await client.messages.create({
    model: modelUsed,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Extract a lead from this email. Return JSON matching exactly:
{
  "fname": string,
  "lname": string,
  "email": string,
  "phone": string,
  "org": string,
  "title": string,
  "interest": string,
  "source": "google"|"facebook"|"instagram"|"linkedin"|"email"|"organic"|"bark"|"",
  "notes": string,
  "warnings": [string]
}

${sourceHint ? `Caller hints source = "${sourceHint}". Honour it unless the email clearly contradicts.\n\n` : ''}Email:
"""
${rawText.slice(0, 12_000)}
"""`,
      },
    ],
  }).catch((err: unknown) => {
    // Network failure or 23s timeout — return null so the block below yields the
    // manual-entry fallback instead of surfacing an opaque 500.
    console.warn('[lead-extractor] AI call failed — using manual-entry fallback:', err instanceof Error ? err.message : err)
    return null
  })

  try {
    const raw = response && response.content[0]?.type === 'text' ? response.content[0].text : ''
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned) as Partial<ExtractedLead>

    return {
      fname: (parsed.fname ?? '').trim(),
      lname: (parsed.lname ?? '').trim(),
      email: (parsed.email ?? '').trim(),
      phone: (parsed.phone ?? '').trim() || undefined,
      org: (parsed.org ?? '').trim(),
      title: (parsed.title ?? '').trim() || undefined,
      interest: (parsed.interest ?? '').trim() || undefined,
      source: (parsed.source ?? sourceHint ?? '') as LeadSource,
      notes: (parsed.notes ?? '').trim() || undefined,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      model_used: modelUsed,
    }
  }
  catch {
    return {
      fname: '',
      lname: '',
      email: '',
      org: '',
      source: sourceHint ?? '',
      warnings: ['AI extraction returned unparseable output — fill the form manually'],
      model_used: modelUsed,
    }
  }
}
