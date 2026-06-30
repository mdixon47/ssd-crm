import { z } from 'zod'
import { getResendClient, getFromEmail, getFromHeader } from '~/server/utils/resend'
import { createSupabaseClient } from '~/server/utils/supabase'

const schema = z.object({
  leadId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const { leadId, to, subject, body: emailBody } = parsed.data
  const fromEmail = getFromEmail()
  const resend = getResendClient()
  const supabase = createSupabaseClient()

  // Send via Resend
  const { data: sent, error: sendError } = await resend.emails.send({
    from: getFromHeader(),
    to: [to],
    subject,
    text: emailBody,
  })

  // Persist regardless of send result (track failures too)
  const { data: saved, error: dbError } = await supabase
    .from('email_messages')
    .insert({
      lead_id: leadId,
      to_email: to,
      from_email: fromEmail,
      subject,
      body: emailBody,
      direction: 'outbound',
      status: sendError ? 'failed' : 'sent',
      resend_id: sent?.id ?? null,
      error: sendError ? sendError.message : null,
    })
    .select()
    .single()

  if (sendError) {
    throw createError({ statusCode: 502, message: `Email send failed: ${sendError.message}` })
  }

  if (dbError) {
    console.error('[email/send] DB insert error:', dbError.message)
  }

  return { data: saved }
})
