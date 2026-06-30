import { z } from 'zod'
import { getFromEmail } from '~/server/utils/resend'
import { createSupabaseClient } from '~/server/utils/supabase'

// Record an inbound reply from a lead into the conversation thread.
// Resend does not parse inbound mail without extra DNS/webhook setup, so
// replies are logged here (manually from the UI, or by a future webhook).
const schema = z.object({
  leadId: z.string().uuid(),
  from: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  receivedAt: z.string().datetime().optional(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const { leadId, from, subject, body: emailBody, receivedAt } = parsed.data
  const supabase = createSupabaseClient()

  const { data: saved, error } = await supabase
    .from('email_messages')
    .insert({
      lead_id: leadId,
      to_email: getFromEmail(),
      from_email: from,
      subject,
      body: emailBody,
      direction: 'inbound',
      status: 'received',
      ...(receivedAt ? { created_at: receivedAt } : {}),
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data: saved }
})
