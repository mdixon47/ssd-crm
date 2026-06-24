// Unit coverage for the Weekly Audit Agent — verifies the single forced-tool
// contract (no serial loop, no separate conversion call). Anthropic stubbed.
import { describe, it, expect, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import type { Campaign, Lead, SearchTerm, NegativeKeyword } from '~/types'
import { runWeeklyAuditAgent } from '~/agents/WeeklyAuditAgent'

const CONTEXT = {
  campaigns: [
    { name: 'Grants Search', platform: 'google', spend: 1000, leads: 20, qualified: 10, conversions: 5, revenue: 4000, status: 'active', budgetShare: 0.5 },
  ] as unknown as Campaign[],
  leads: [
    { stage: 'Qualified', source: 'google', qualified: 'yes', revenue: 4000, gclid: 'abc', campaign: 'Grants Search', updated_at: '2026-06-20', lead_date: '2026-06-22' },
  ] as unknown as Lead[],
  searchTerms: [
    { term: 'free grant template', campaign: 'Grants Search', conversions: 0, cost: 80, clicks: 10, label: 'negative' },
  ] as unknown as SearchTerm[],
  negativeKeywords: [] as unknown as NegativeKeyword[],
}

function stubAnthropic(content: unknown[]) {
  const create = vi.fn(async () => ({ content, usage: { input_tokens: 100, output_tokens: 200 } })) as unknown as Anthropic['messages']['create']
  return { client: { messages: { create } } as unknown as Anthropic, create: create as unknown as ReturnType<typeof vi.fn> }
}

describe('runWeeklyAuditAgent', () => {
  it('returns a structured report from one forced-tool call', async () => {
    const { client, create } = stubAnthropic([{
      type: 'tool_use', id: 'a1', name: 'submit_audit',
      input: {
        campaigns_to_scale: ['Grants Search'],
        negative_keyword_suggestions: ['free grant template'],
        summary: 'Strong week.',
        overall_health: 'strong',
      },
    }])
    const result = await runWeeklyAuditAgent(client, CONTEXT)
    expect(create).toHaveBeenCalledTimes(1)
    expect(result.overall_health).toBe('strong')
    expect(result.campaigns_to_scale).toEqual(['Grants Search'])
    expect(result.generated_at).toBeTruthy()
  })

  it('degrades gracefully when no tool_use is returned', async () => {
    const { client } = stubAnthropic([{ type: 'text', text: 'no tool' }])
    const result = await runWeeklyAuditAgent(client, CONTEXT)
    expect(result.overall_health).toBe('needs_attention')
    expect(result.tracking_issues.join(' ')).toMatch(/retry/i)
  })
})
