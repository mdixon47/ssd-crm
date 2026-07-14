import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { runCampaignOptimizerAgent } from '~/agents/CampaignOptimizerAgent'
import { getGoogleCampaigns } from '~/server/utils/campaigns'

export default defineEventHandler(async (_event) => {
  const client = getAnthropicClient()
  const supabase = createSupabaseClient()

  // Leads for context + campaign data (live when Google Ads is configured, else mock).
  const [{ data: leads }, { mode, campaigns }] = await Promise.all([
    supabase.from('leads').select('*'),
    getGoogleCampaigns(),
  ])

  const result = await runCampaignOptimizerAgent(
    client,
    campaigns,
    leads ?? [],
    mode,
  )

  return { data: result, dataMode: mode }
})
