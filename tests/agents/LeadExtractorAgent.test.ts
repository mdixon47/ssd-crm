// Unit coverage for the Lead Extractor Agent. The Anthropic client is
// stubbed — we only verify the agent's parsing / fallback contract, not
// the model's behaviour.
import { describe, it, expect, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { runLeadExtractorAgent } from '~/agents/LeadExtractorAgent'

type CreateFn = Anthropic['messages']['create']

function stubClient(text: string): { client: Anthropic, create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => ({
    content: [{ type: 'text', text }],
  })) as unknown as CreateFn
  const client = {
    messages: { create },
  } as unknown as Anthropic
  return { client, create: create as unknown as ReturnType<typeof vi.fn> }
}

describe('runLeadExtractorAgent', () => {
  it('parses a well-formed JSON response and trims fields', async () => {
    const { client } = stubClient(JSON.stringify({
      fname: '  Jane ',
      lname: 'Doe',
      email: 'jane@example.com',
      phone: '555-1234',
      org: 'Acme Nonprofit',
      title: 'Executive Director',
      interest: 'Grant writing',
      source: 'bark',
      notes: 'Needs proposal by Friday.',
      warnings: [],
    }))

    const result = await runLeadExtractorAgent(client, 'pasted email body here'.repeat(2))

    expect(result.fname).toBe('Jane')
    expect(result.lname).toBe('Doe')
    expect(result.email).toBe('jane@example.com')
    expect(result.phone).toBe('555-1234')
    expect(result.org).toBe('Acme Nonprofit')
    expect(result.source).toBe('bark')
    expect(result.warnings).toEqual([])
    expect(result.model_used).toMatch(/^claude-/)
  })

  it('strips ```json fences before parsing', async () => {
    const { client } = stubClient([
      '```json',
      JSON.stringify({ fname: 'Sam', lname: 'Park', email: 's@p.io', org: 'Park LLC', source: 'organic', warnings: [] }),
      '```',
    ].join('\n'))

    const result = await runLeadExtractorAgent(client, 'contact-form body that is long enough')

    expect(result.fname).toBe('Sam')
    expect(result.source).toBe('organic')
  })

  it('falls back gracefully when the response is not valid JSON', async () => {
    const { client } = stubClient('I am sorry, I could not parse this email.')

    const result = await runLeadExtractorAgent(client, 'gibberish input long enough to pass', 'bark')

    expect(result.fname).toBe('')
    expect(result.email).toBe('')
    expect(result.source).toBe('bark')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toMatch(/unparseable/i)
  })

  it('uses sourceHint when the model omits source', async () => {
    const { client } = stubClient(JSON.stringify({
      fname: 'Pat', lname: 'Lee', email: 'p@l.io', org: 'Lee Co', warnings: [],
    }))

    const result = await runLeadExtractorAgent(client, 'forwarded email body here', 'email')

    expect(result.source).toBe('email')
  })

  it('coerces empty optional strings to undefined', async () => {
    const { client } = stubClient(JSON.stringify({
      fname: 'A', lname: 'B', email: 'a@b.io', phone: '', org: 'X',
      title: '', interest: '', source: 'bark', notes: '', warnings: [],
    }))

    const result = await runLeadExtractorAgent(client, 'a sufficiently long body of text')

    expect(result.phone).toBeUndefined()
    expect(result.title).toBeUndefined()
    expect(result.interest).toBeUndefined()
    expect(result.notes).toBeUndefined()
  })

  it('truncates rawText input at 12k chars before sending', async () => {
    const { client, create } = stubClient(JSON.stringify({
      fname: 'L', lname: 'M', email: 'l@m.io', org: 'M', source: 'email', warnings: [],
    }))

    const huge = 'x'.repeat(20_000)
    await runLeadExtractorAgent(client, huge)

    const call = create.mock.calls[0]?.[0] as { messages: { content: string }[] }
    const userContent = call.messages[0].content
    // 12 000 x's plus the surrounding prompt scaffolding.
    expect(userContent).toContain('x'.repeat(12_000))
    expect(userContent).not.toContain('x'.repeat(12_001))
  })

  it('returns warnings array when the model flags low-confidence fields', async () => {
    const { client } = stubClient(JSON.stringify({
      fname: 'Unknown', lname: '', email: 'lead@bark.com', org: '',
      source: 'bark', warnings: ['lname missing', 'org missing'],
    }))

    const result = await runLeadExtractorAgent(client, 'bark notification body content here')

    expect(result.warnings).toEqual(['lname missing', 'org missing'])
  })
})
