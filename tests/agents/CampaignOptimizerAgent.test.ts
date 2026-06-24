// Unit coverage for the Campaign Optimizer — verifies the single forced-tool
// contract (no serial loop, no separate conversion call). Anthropic stubbed.
import { describe, it, expect, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import type { Campaign, Lead } from '~/types'
import { runCampaignOptimizerAgent } from '~/agents/CampaignOptimizerAgent'

const CAMPAIGNS = [
  { name: 'Grants Search', platform: 'google', spend: 1000, leads: 20, qualified: 10, conversions: 5, revenue: 4000, status: 'active', budgetShare: 0.5 },
] as unknown as Campaign[]
const LEADS = [
  { campaign: 'Grants Search', qualified: 'yes', revenue: 4000, keyword: 'grant writing', notes: '', stage: 'Qualified', source: 'google' },
] as unknown as Lead[]

function stubAnthropic(content: unknown[]) {
  const create = vi.fn(async () => ({ content, usage: { input_tokens: 100, output_tokens: 200 } })) as unknown as Anthropic['messages']['create']
  return { client: { messages: { create } } as unknown as Anthropic, create: create as unknown as ReturnType<typeof vi.fn> }
}

describe('runCampaignOptimizerAgent', () => {
  it('returns structured output from one forced-tool call', async () => {
    const { client, create } = stubAnthropic([{
      type: 'tool_use', id: 'o1', name: 'submit_optimization',
      input: {
        recommendations: [{ campaign: 'Grants Search', action: 'scale', reason: 'ROAS 4x', priority: 'high' }],
        budget_shifts: [], keyword_actions: [], landing_page_flags: [], tracking_issues: [],
        summary: 'Scale the winner.',
      },
    }])
    const result = await runCampaignOptimizerAgent(client, CAMPAIGNS, LEADS)
    expect(create).toHaveBeenCalledTimes(1)
    expect(result.recommendations[0].action).toBe('scale')
    expect(result.tokens_used).toBe(300)
  })

  it('degrades gracefully when no tool_use is returned', async () => {
    const { client } = stubAnthropic([{ type: 'text', text: 'no tool' }])
    const result = await runCampaignOptimizerAgent(client, CAMPAIGNS, LEADS)
    expect(result.recommendations).toEqual([])
    expect(result.tracking_issues.join(' ')).toMatch(/retry/i)
  })
})
