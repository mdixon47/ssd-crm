// Unit coverage for the Content Publishing Agent. The Anthropic + Supabase
// clients are stubbed — we verify the orchestration contract (one model call
// per platform, all pieces saved, partial failures tolerated), not model output.
import { describe, it, expect, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { runContentPublishingAgent } from '~/agents/ContentPublishingAgent'

// ── Supabase stub ───────────────────────────────────────────
// Reads (leads / content_items select chains) resolve to {data}.
// Inserts resolve to {data:{id}, error:null} with an incrementing id.
function stubSupabase() {
  let insertId = 0
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  Object.assign(builder, {
    select: chain, gte: chain, in: chain, eq: chain, order: chain, limit: chain,
    insert: chain,
    single: () => Promise.resolve({ data: { id: `c${++insertId}` }, error: null }),
    then: (resolve: (v: { data: unknown[] }) => unknown) => Promise.resolve({ data: [] }).then(resolve),
  })
  return { from: () => builder, _inserts: () => insertId } as unknown as
    Parameters<typeof runContentPublishingAgent>[1] & { _inserts: () => number }
}

// ── Anthropic stub ──────────────────────────────────────────
function stubAnthropic(makeContent: (callIndex: number) => unknown[]) {
  let i = 0
  const create = vi.fn(async () => ({ content: makeContent(i++) })) as unknown as Anthropic['messages']['create']
  return { client: { messages: { create } } as unknown as Anthropic, create: create as unknown as ReturnType<typeof vi.fn> }
}

const toolUse = (title: string) => [{
  type: 'tool_use', id: 't1', name: 'submit_content',
  input: { title, body: `body for ${title}`, content_type: 'post', hashtags: ['#x'], angle: 'sharp hook' },
}]

describe('runContentPublishingAgent', () => {
  it('generates and saves one piece per platform for "all" (one model call each)', async () => {
    const { client, create } = stubAnthropic(i => toolUse(`piece ${i}`))
    const supabase = stubSupabase()

    const result = await runContentPublishingAgent(client, supabase, { topic: 'grant rejections', platform: 'all' })

    expect(create).toHaveBeenCalledTimes(4) // linkedin, facebook, instagram, email
    expect(result.savedIds).toHaveLength(4)
    expect(result.items).toHaveLength(4)
    expect(result.items.map(p => p.platform).sort()).toEqual(['facebook', 'instagram', 'linkedin', 'email'].sort())
  })

  it('makes a single model call for a single platform', async () => {
    const { client, create } = stubAnthropic(() => toolUse('one'))
    const result = await runContentPublishingAgent(client, stubSupabase(), { topic: 't', platform: 'linkedin' })
    expect(create).toHaveBeenCalledTimes(1)
    expect(result.savedIds).toHaveLength(1)
  })

  it('skips a platform whose model call returns no tool_use, without failing the rest', async () => {
    // call 0 (linkedin) returns plain text → skipped; others return content
    const { client } = stubAnthropic(i => (i === 0 ? [{ type: 'text', text: 'no tool' }] : toolUse(`p${i}`)))
    const result = await runContentPublishingAgent(client, stubSupabase(), { topic: 't', platform: 'all' })
    expect(result.savedIds).toHaveLength(3)
    expect(result.strategy_notes).toContain('could not be generated')
  })
})
