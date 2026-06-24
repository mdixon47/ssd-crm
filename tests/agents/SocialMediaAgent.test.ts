// Unit coverage for the Social Media Agent. The Anthropic client is stubbed —
// we verify the single-call forced-tool contract and structured output mapping.
import { describe, it, expect, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import type { SocialPlatformData } from '~/types'
import { runSocialMediaAgent } from '~/agents/SocialMediaAgent'

const PLATFORM = {
  tagline: 'Win more grants',
  campaigns: [
    { name: 'GW101 Reels', objective: 'leads', audience: 'EDs', adFormat: 'reel', spend: 1000, leads: 20, revenue: 4000, reach: 50000, cpl: 50, status: 'active', notes: '' },
  ],
  posts: [
    { title: 'Grant myths', format: 'reel', reach: 12000, leads: 8 },
  ],
  audiences: ['Nonprofit EDs'],
  adFormats: ['reel', 'carousel'],
} as unknown as SocialPlatformData

function stubAnthropic(content: unknown[]) {
  const create = vi.fn(async () => ({ content, usage: { input_tokens: 100, output_tokens: 200 } })) as unknown as Anthropic['messages']['create']
  return { client: { messages: { create } } as unknown as Anthropic, create: create as unknown as ReturnType<typeof vi.fn> }
}

const strategyToolUse = [{
  type: 'tool_use', id: 's1', name: 'submit_strategy',
  input: {
    health: 'moderate',
    recommendations: [{ area: 'creative', action: 'Test new hook', priority: 'high', rationale: 'low CTR' }],
    post_ideas: [{ title: 'Idea', format: 'reel', hook: 'Stop', audience: 'EDs', cta: 'DM' }],
    scale_candidates: ['GW101 Reels'],
    pause_candidates: [],
    summary: 'Solid but creative-bound.',
  },
}]

describe('runSocialMediaAgent', () => {
  it('returns structured strategy from a single forced-tool call', async () => {
    const { client, create } = stubAnthropic(strategyToolUse)
    const result = await runSocialMediaAgent(client, 'li', PLATFORM)

    expect(create).toHaveBeenCalledTimes(1) // no agentic loop, no separate conversion call
    expect(result.platform).toBe('li')
    expect(result.health).toBe('moderate')
    expect(result.recommendations).toHaveLength(1)
    expect(result.scale_candidates).toEqual(['GW101 Reels'])
    expect(result.tokens_used).toBe(300)
    expect(result.model_used).toBeTruthy()
  })

  it('degrades gracefully when no tool_use is returned', async () => {
    const { client } = stubAnthropic([{ type: 'text', text: 'oops' }])
    const result = await runSocialMediaAgent(client, 'fb', PLATFORM)
    expect(result.health).toBe('needs_attention')
    expect(result.recommendations).toEqual([])
    expect(result.summary).toMatch(/retry/i)
  })
})
