import { z } from 'zod'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { runEmailStrategistAgent } from '~/agents/EmailStrategistAgent'

const schema = z.object({
  maxRecipients: z.number().int().min(1).max(20).optional(),
  focus: z.string().max(200).optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event).catch(() => ({}))
  const parsed = schema.safeParse(body ?? {})
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const client = getAnthropicClient()
  const supabase = createSupabaseClient()

  const { data: leads } = await supabase.from('leads').select('*')

  const result = await runEmailStrategistAgent(client, leads ?? [], {
    maxRecipients: parsed.data.maxRecipients,
    focus: parsed.data.focus,
  })

  return { data: result }
})
