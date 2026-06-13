import { createSupabaseClient } from '~/server/utils/supabase'
import { getResendClient, getFromEmail } from '~/server/utils/resend'
import type { EmailCampaignFilter } from '~/types'

function applyMergeTags(text: string, lead: Record<string, string>): string {
  return text
    .replace(/\{\{first_name\}\}/gi, lead.fname || 'there')
    .replace(/\{\{last_name\}\}/gi, lead.lname || '')
    .replace(/\{\{full_name\}\}/gi, `${lead.fname || ''} ${lead.lname || ''}`.trim() || 'there')
    .replace(/\{\{org\}\}/gi, lead.org || '')
    .replace(/\{\{email\}\}/gi, lead.email || '')
}

function buildHtml(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1e293b;max-width:600px;margin:0 auto;padding:32px 24px">
  ${escaped}
  <hr style="margin:32px 0;border:none;border-top:1px solid #e2e8f0">
  <p style="font-size:12px;color:#94a3b8">SSD Consulting · You are receiving this because you opted in.</p>
</body>
</html>`
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing campaign id' })

  const supabase = createSupabaseClient()

  // Load campaign — must be draft
  const { data: campaign, error: ce } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (ce) throw createError({ statusCode: 404, message: 'Campaign not found' })
  if (campaign.status !== 'draft') {
    throw createError({ statusCode: 409, message: 'Campaign has already been sent' })
  }

  // Mark sending
  await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', id)

  // Fetch matching leads
  const filter = campaign.recipient_filter as EmailCampaignFilter
  let query = supabase
    .from('leads')
    .select('id,fname,lname,email,org,source,stage')
    .not('email', 'is', null)
    .neq('email', '')

  if (filter.stages?.length) query = query.in('stage', filter.stages)
  if (filter.sources?.length) query = query.in('source', filter.sources)

  const { data: leads, error: le } = await query
  if (le) {
    await supabase.from('email_campaigns').update({ status: 'failed' }).eq('id', id)
    throw createError({ statusCode: 500, message: le.message })
  }

  const resend = getResendClient()
  const fromEmail = getFromEmail()
  let sentCount = 0
  let failCount = 0

  for (const lead of leads ?? []) {
    const personalizedBody = applyMergeTags(campaign.body, lead)
    const personalizedSubject = applyMergeTags(campaign.subject, lead)

    const { data: sent, error: sendError } = await resend.emails.send({
      from: `SSD Consulting <${fromEmail}>`,
      to: [lead.email],
      subject: personalizedSubject,
      text: personalizedBody,
      html: buildHtml(personalizedBody),
    })

    await supabase.from('email_campaign_recipients').insert({
      campaign_id: id,
      lead_id: lead.id,
      email: lead.email,
      lead_name: `${lead.fname ?? ''} ${lead.lname ?? ''}`.trim() || lead.email,
      status: sendError ? 'failed' : 'sent',
      resend_id: sent?.id ?? null,
      error: sendError ? sendError.message : null,
    })

    if (sendError) failCount++
    else sentCount++
  }

  const finalStatus = failCount === (leads?.length ?? 0) ? 'failed' : 'sent'

  await supabase.from('email_campaigns').update({
    status: finalStatus,
    recipient_count: sentCount,
    sent_at: new Date().toISOString(),
  }).eq('id', id)

  return { data: { sent: sentCount, failed: failCount, total: leads?.length ?? 0 } }
})
