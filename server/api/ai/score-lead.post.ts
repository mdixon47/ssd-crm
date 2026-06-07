import { getAnthropicClient } from '~/server/utils/anthropic'
import { runLeadScorerAgent } from '~/agents/LeadScorerAgent'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.lead) throw createError({ statusCode: 400, message: 'lead object is required' })

  const client = getAnthropicClient()
  const result = await runLeadScorerAgent(client, body.lead)
  return { data: result }
})
