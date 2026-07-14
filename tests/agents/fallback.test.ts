// Verifies improvement #1: when the Anthropic call fails (timeout / 429 / 529 —
// the client is bound at 23s, maxRetries:0), every agent returns its graceful
// fallback instead of throwing, so the AI routes never surface an opaque 500.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import type { Lead, Campaign, SearchTerm, NegativeKeyword, SocialPlatformData } from '~/types'
import { runLeadScorerAgent } from '~/agents/LeadScorerAgent'
import { runLeadExtractorAgent } from '~/agents/LeadExtractorAgent'
import { runEmailAgent } from '~/agents/EmailAgent'
import { runCampaignOptimizerAgent } from '~/agents/CampaignOptimizerAgent'
import { runWeeklyAuditAgent } from '~/agents/WeeklyAuditAgent'
import { runSocialMediaAgent } from '~/agents/SocialMediaAgent'
import { runEmailStrategistAgent } from '~/agents/EmailStrategistAgent'
import { runCRMOperationsAgent } from '~/agents/CRMOperationsAgent'

// A client whose messages.create() always rejects, like an upstream timeout.
function throwingClient(): Anthropic {
  const create = vi.fn(async () => {
    throw new Error('Request timed out.')
  }) as unknown as Anthropic['messages']['create']
  return { messages: { create } } as unknown as Anthropic
}

const LEAD = { fname: 'A', lname: 'B', org: 'X', email: 'a@b.io' } as unknown as Lead
const CAMPAIGNS = [{ name: 'C', platform: 'google', spend: 100, leads: 2, qualified: 1, conversions: 1, revenue: 400, status: 'active', budgetShare: 1 }] as unknown as Campaign[]

beforeEach(() => {
  // The agents log the failure via console.warn/error — silence it in tests.
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('agent fallbacks on Anthropic failure', () => {
  it('LeadScorer returns a neutral score, not a throw', async () => {
    const r = await runLeadScorerAgent(throwingClient(), LEAD)
    expect(r.score).toBe(5)
    expect(r.tier).toBe('B')
    expect(r.model_used).toMatch(/^claude-/)
  })

  it('LeadExtractor returns a manual-entry fallback', async () => {
    const r = await runLeadExtractorAgent(throwingClient(), 'some pasted email body', 'bark')
    expect(r.fname).toBe('')
    expect(r.source).toBe('bark')
    expect(r.warnings).toHaveLength(1)
  })

  it('Email agent returns a generic follow-up draft', async () => {
    const r = await runEmailAgent(throwingClient(), LEAD)
    expect(r.subject).toBeTruthy()
    expect(r.body).toContain('follow up')
  })

  it('CampaignOptimizer returns an empty structured result', async () => {
    const r = await runCampaignOptimizerAgent(throwingClient(), CAMPAIGNS, [])
    expect(r.recommendations).toEqual([])
    expect(r.tokens_used).toBe(0)
    expect(r.tracking_issues.join(' ')).toMatch(/retry/i)
  })

  it('WeeklyAudit returns a needs_attention report', async () => {
    const r = await runWeeklyAuditAgent(throwingClient(), {
      campaigns: CAMPAIGNS,
      leads: [],
      searchTerms: [] as unknown as SearchTerm[],
      negativeKeywords: [] as unknown as NegativeKeyword[],
    })
    expect(r.overall_health).toBe('needs_attention')
    expect(r.generated_at).toBeTruthy()
  })

  it('SocialMedia returns a needs_attention strategy', async () => {
    const platform = { tagline: 't', campaigns: [], posts: [], audiences: [], adFormats: [] } as unknown as SocialPlatformData
    const r = await runSocialMediaAgent(throwingClient(), 'li', platform)
    expect(r.health).toBe('needs_attention')
    expect(r.recommendations).toEqual([])
  })

  it('EmailStrategist returns an empty plan', async () => {
    const r = await runEmailStrategistAgent(throwingClient(), [])
    expect(r.suggestions).toEqual([])
    expect(r.summary).toMatch(/try again/i)
  })

  it('CRMOperations returns a partial-progress message with no actions', async () => {
    const r = await runCRMOperationsAgent(throwingClient(), {} as never, 'summarize my leads')
    expect(r.actions).toEqual([])
    expect(typeof r.reply).toBe('string')
    expect(r.reply.length).toBeGreaterThan(0)
  })
})
