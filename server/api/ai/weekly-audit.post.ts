import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { runWeeklyAuditAgent } from '~/agents/WeeklyAuditAgent'
import { GOOGLE_CAMPAIGNS } from '~/lib/mockData'

export default defineEventHandler(async (_event) => {
  const client = getAnthropicClient()
  const supabase = createSupabaseClient()

  // Fetch all relevant data
  const [leadsResult, searchTermsResult, negKwResult] = await Promise.all([
    supabase.from('leads').select('*'),
    supabase.from('search_terms').select('*'),
    supabase.from('negative_keywords').select('*').eq('active', true),
  ])

  const weekDate = new Date().toISOString().slice(0, 10)

  const report = await runWeeklyAuditAgent(client, {
    campaigns: GOOGLE_CAMPAIGNS,
    leads: leadsResult.data ?? [],
    searchTerms: searchTermsResult.data ?? [],
    negativeKeywords: negKwResult.data ?? [],
    weekDate,
  })

  // Save to Supabase
  await supabase.from('audit_sessions').insert({
    week_date: weekDate,
    status: 'complete',
    report,
  })

  return { data: report }
})
