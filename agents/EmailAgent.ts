// ============================================================
// Email Agent
// Drafts personalized outreach emails for leads using their
// CRM context (stage, interest, score, org) and a purpose hint.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { Lead } from '~/types'
import { CLAUDE_HAIKU } from '~/lib/models'

export interface EmailDraftResult {
  subject: string
  body: string
  model_used: string
}

// A prior message in the lead's email thread, oldest first.
export interface EmailHistoryItem {
  direction: 'outbound' | 'inbound'
  subject: string
  body: string
}

const SYSTEM_PROMPT = `You are an email copywriter for SSD Consulting, a firm specializing in:
- Grant Writing 101 Course (~$597)
- Grants Management Consulting ($5K–$25K)
- Behavioral Health Consulting ($8K–$30K)

Write warm, professional outreach emails for leads in our CRM. Follow these rules:
- Use the lead's first name and reference their organization when known
- Match the tone to their stage: casual for new leads, more direct for warm/qualified leads
- Keep emails concise — 3–5 short paragraphs max
- End with a clear, single call to action
- Never sound robotic or overly salesy
- Sign off as "Malik" from "SSD Consulting"

Return ONLY valid JSON. No markdown fences.`

export async function runEmailAgent(
  client: Anthropic,
  lead: Partial<Lead>,
  purpose?: string,
  history: EmailHistoryItem[] = [],
): Promise<EmailDraftResult> {
  const modelUsed = CLAUDE_HAIKU

  const leadContext = `
Name: ${lead.fname} ${lead.lname}
Organization: ${lead.org || 'Unknown'}
Title: ${lead.title || 'Unknown'}
Email: ${lead.email}
Stage: ${lead.stage || 'New Lead'}
Interest: ${lead.interest || 'Not specified'}
Source: ${lead.source || 'Unknown'}
Notes: ${lead.notes || 'None'}
  `.trim()

  const hasThread = history.length > 0

  // Keep the prompt small for the 26s wall — last 6 messages, bodies trimmed.
  const threadText = hasThread
    ? history
        .slice(-6)
        .map((m) => {
          const who = m.direction === 'inbound' ? `${lead.fname || 'Lead'}` : 'Malik (SSD)'
          return `[${who}] Subject: ${m.subject}\n${m.body.slice(0, 600)}`
        })
        .join('\n\n---\n\n')
    : ''

  const purposeText = purpose
    ? `Purpose: ${purpose}`
    : hasThread
      ? `Purpose: Write the next reply in this ongoing conversation`
      : `Purpose: Follow up based on their current pipeline stage`

  const threadBlock = hasThread
    ? `\n\nConversation so far (oldest first — write the next reply from Malik):\n${threadText}`
    : ''

  const response = await client.messages.create({
    model: modelUsed,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Draft an email for this lead and return JSON matching exactly:
{
  "subject": string,
  "body": string
}

${purposeText}
${hasThread ? 'This is a reply — keep the subject consistent with the thread (add "Re:" if appropriate) and respond directly to their latest message.' : ''}

Lead:
${leadContext}${threadBlock}`,
      },
    ],
  })

  try {
    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return {
      subject: parsed.subject || '',
      body: parsed.body || '',
      model_used: modelUsed,
    }
  }
  catch {
    return {
      subject: `Following up — ${lead.org || 'SSD Consulting'}`,
      body: `Hi ${lead.fname},\n\nI wanted to follow up regarding your interest in our services. I'd love to connect and learn more about how we can support ${lead.org || 'your organization'}.\n\nWould you have 20 minutes for a quick call this week?\n\nBest,\nMalik\nSSD Consulting`,
      model_used: modelUsed,
    }
  }
}
