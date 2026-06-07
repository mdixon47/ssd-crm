import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { runCampaignOptimizerAgent } from '~/agents/CampaignOptimizerAgent'
import { GOOGLE_CAMPAIGNS } from '~/lib/mockData'

export default defineEventHandler(async (event) => {
  const client = getAnthropicClient()
  const supabase = createSupabaseClient()

  // Fetch leads for context
  const { data: leads } = await supabase.from('leads').select('*')

  const result = await runCampaignOptimizerAgent(
    client,
    GOOGLE_CAMPAIGNS,
    leads ?? [],
  )

  return { data: result }
})
