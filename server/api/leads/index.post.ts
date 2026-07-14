import { z } from 'zod'
import { createSupabaseClient } from '~/server/utils/supabase'
import { requireUser } from '~/server/utils/requireUser'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { runLeadScorerAgent, type LeadScore } from '~/agents/LeadScorerAgent'

const LEAD_STAGES = [
  'New Lead', 'Contacted', 'Booked Consultation', 'Qualified',
  'Proposal Sent', 'Purchased Course', 'Became Consulting Client',
  'Not a Fit', 'Lost/No Response',
] as const

const LeadInsertSchema = z.object({
  fname: z.string().trim().min(1).max(80),
  lname: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  org: z.string().trim().min(1).max(160),
  title: z.string().trim().max(120).optional(),
  interest: z.string().trim().max(500).optional(),
  stage: z.enum(LEAD_STAGES).default('New Lead'),
  qualified: z.enum(['yes', 'no', 'partial', '']).default(''),
  source: z.enum(['google', 'facebook', 'instagram', 'linkedin', 'email', 'organic', 'bark', '']).optional(),
  campaign: z.string().trim().max(160).optional(),
  keyword: z.string().trim().max(160).optional(),
  content: z.string().trim().max(160).optional(),
  gclid: z.string().trim().max(512).optional(),
  landing: z.string().trim().max(512).optional(),
  revenue: z.number().nonnegative().max(10_000_000).default(0),
  notes: z.string().trim().max(4000).optional(),
  lead_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  assignee: z.string().trim().max(120).optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const raw = await readBody(event)
  const parsed = LeadInsertSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid lead payload',
      data: { issues: parsed.error.flatten() },
    })
  }
  const body = parsed.data
  const supabase = createSupabaseClient()

  // Insert lead
  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...body,
      // Record ownership so migration 007's owner-or-admin delete policy is
      // enforceable (the service-role key bypasses the RLS DEFAULT auth.uid()).
      created_by: user.id,
      lead_date: body.lead_date ?? new Date().toISOString().slice(0, 10),
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // Auto-score the lead if Anthropic is configured (non-blocking)
  let aiScore: LeadScore | null = null
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = getAnthropicClient()
      aiScore = await runLeadScorerAgent(client, data)

      // Update qualified status based on AI score if not already set
      if (!body.qualified && aiScore) {
        const autoQualified = aiScore.score >= 7 ? 'yes' : aiScore.score >= 4 ? 'partial' : 'no'
        await supabase.from('leads').update({ qualified: autoQualified }).eq('id', data.id)
        data.qualified = autoQualified
      }
    }
    catch (e) {
      console.warn('AI lead scoring failed (non-critical):', e instanceof Error ? e.message : e)
    }
  }

  return { data, aiScore }
})
