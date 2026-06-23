import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { runWeeklyAuditAgent } from '~/agents/WeeklyAuditAgent'
import { getGA4Overview } from '~/server/utils/googleAnalytics'
import { GOOGLE_CAMPAIGNS } from '~/lib/mockData'

export default defineEventHandler(async (_event) => {
  const client = getAnthropicClient()
  const supabase = createSupabaseClient()

  // Fetch all relevant data (GA4 falls back to mock if unconfigured; never block the audit)
  const [leadsResult, searchTermsResult, negKwResult, webAnalytics] = await Promise.all([
    supabase.from('leads').select('*'),
    supabase.from('search_terms').select('*'),
    supabase.from('negative_keywords').select('*').eq('active', true),
    getGA4Overview('LAST_7_DAYS').catch(() => undefined),
  ])

  const weekDate = new Date().toISOString().slice(0, 10)

  const report = await runWeeklyAuditAgent(client, {
    campaigns: GOOGLE_CAMPAIGNS,
    leads: leadsResult.data ?? [],
    searchTerms: searchTermsResult.data ?? [],
    negativeKeywords: negKwResult.data ?? [],
    webAnalytics,
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
