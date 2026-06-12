import { z } from 'zod'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { runLeadExtractorAgent } from '~/agents/LeadExtractorAgent'

// POST /api/leads/extract
// Body: { rawText: string, sourceHint?: LeadSource }
// Returns: { data: ExtractedLead } — does NOT save. Caller previews
// the result and submits via POST /api/leads.
const schema = z.object({
  rawText: z.string().trim().min(20).max(20_000),
  sourceHint: z.enum(['google', 'facebook', 'instagram', 'linkedin', 'email', 'organic', 'bark', '']).optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid extract payload',
      data: { issues: parsed.error.flatten() },
    })
  }

  const client = getAnthropicClient()
  const result = await runLeadExtractorAgent(client, parsed.data.rawText, parsed.data.sourceHint)
  return { data: result }
})
