// ============================================================
// Lead Scorer Agent
// Scores an incoming lead 1–10 based on org type, role,
// stated interest, and source fit. Flags high-value leads
// for priority follow-up.
// ============================================================
import Anthropic from '@anthropic-ai/sdk'
import type { Lead } from '~/types'

export interface LeadScore {
  score: number         // 1–10
  tier: 'A' | 'B' | 'C' | 'D'
  reasoning: string
  fit_signals: string[]
  red_flags: string[]
  recommended_next_step: string
  estimated_deal_value: string
  urgency: 'high' | 'medium' | 'low'
  model_used: string
}

const SYSTEM_PROMPT = `You are a CRM specialist for SSD Consulting. Score inbound leads on fit and likely value.

IDEAL CUSTOMER PROFILES:

Tier A (Score 8–10):
- Nonprofit Executive Director or CEO making training/consulting decisions
- Organization with 5+ employees and active grant programs
- Behavioral health agency needing compliance or workforce training
- Has budget authority and is ready to move in 30 days

Tier B (Score 5–7):
- Program Manager or Development Director with influence but not final authority
- Small organization exploring options
- Expressed strong interest in a specific paid offer
- Likely fit but needs qualification

Tier C (Score 3–4):
- Interest in free content only
- Role unclear or doesn't match buyer profile
- Very small org or individual consultant
- Long timeline (6+ months)

Tier D (Score 1–2):
- Job seekers or students
- Looking for personal grants
- Clinical patients searching for treatment
- No organizational affiliation

Estimated deal values:
- GW101 Course: ~$597
- Grants Management Consulting: $5,000–$25,000
- Behavioral Health Consulting: $8,000–$30,000
- Multiple services: up to $50,000+`

export async function runLeadScorerAgent(
  client: Anthropic,
  lead: Partial<Lead>,
): Promise<LeadScore> {
  const modelUsed = 'claude-haiku-4-5-20251001' // Use fast/cheap model for scoring

  const leadSummary = `
Name: ${lead.fname} ${lead.lname}
Title: ${lead.title || 'Unknown'}
Organization: ${lead.org}
Email: ${lead.email}
Interest: ${lead.interest || 'Not specified'}
Source: ${lead.source || 'Unknown'}
Campaign: ${lead.campaign || 'Unknown'}
Keyword: ${lead.keyword || 'Unknown'}
Notes: ${lead.notes || 'None'}
  `.trim()

  const response = await client.messages.create({
    model: modelUsed,
    max_tokens: 1024,
    system: SYSTEM_PROMPT + '\n\nReturn ONLY valid JSON. No markdown.',
    messages: [
      {
        role: 'user',
        content: `Score this lead and return JSON matching exactly:
{
  "score": number (1-10),
  "tier": "A"|"B"|"C"|"D",
  "reasoning": string,
  "fit_signals": [string],
  "red_flags": [string],
  "recommended_next_step": string,
  "estimated_deal_value": string,
  "urgency": "high"|"medium"|"low"
}

Lead:
${leadSummary}`,
      },
    ],
  })

  try {
    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      ...parsed,
      model_used: modelUsed,
    }
  }
  catch {
    return {
      score: 5,
      tier: 'B',
      reasoning: 'Could not parse AI score — review lead manually',
      fit_signals: [],
      red_flags: ['AI scoring error'],
      recommended_next_step: 'Review lead manually and qualify via discovery call',
      estimated_deal_value: 'Unknown',
      urgency: 'medium',
      model_used: modelUsed,
    }
  }
}
