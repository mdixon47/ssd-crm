import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { runWeeklyAuditAgent } from '~/agents/WeeklyAuditAgent'
import { getGA4Overview } from '~/server/utils/googleAnalytics'
import { getGoogleCampaigns } from '~/server/utils/campaigns'

export default defineEventHandler(async (_event) => {
  const client = getAnthropicClient()
  const supabase = createSupabaseClient()

  // Fetch all relevant data (GA4 + campaigns fall back to mock if unconfigured; never block the audit)
  const [leadsResult, searchTermsResult, negKwResult, webAnalytics, campaignData] = await Promise.all([
    supabase.from('leads').select('*'),
    supabase.from('search_terms').select('*'),
    supabase.from('negative_keywords').select('*').eq('active', true),
    getGA4Overview('LAST_7_DAYS').catch(() => undefined),
    getGoogleCampaigns(),
  ])

  const weekDate = new Date().toISOString().slice(0, 10)

  const report = await runWeeklyAuditAgent(client, {
    campaigns: campaignData.campaigns,
    leads: leadsResult.data ?? [],
    searchTerms: searchTermsResult.data ?? [],
    negativeKeywords: negKwResult.data ?? [],
    webAnalytics,
    weekDate,
    dataMode: campaignData.mode,
  })

  // Save to Supabase
  await supabase.from('audit_sessions').insert({
    week_date: weekDate,
    status: 'complete',
    report,
  })

  return { data: report, dataMode: campaignData.mode }
})
