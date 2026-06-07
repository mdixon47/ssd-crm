// ============================================================
// useMCP — client-side composable for calling MCP tool endpoints
// MCP servers live in /server/mcp/* and are exposed as
// HTTP endpoints via /api/mcp/* routes.
// ============================================================
import type { MCPToolResult } from '~/types'

type MCPServer = 'crm' | 'google-ads' | 'meta-ads' | 'linkedin-ads'

export function useMCP() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ── Generic tool call ─────────────────────────────────────
  async function callTool(
    server: MCPServer,
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<MCPToolResult | null> {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<MCPToolResult>(`/api/mcp/${server}`, {
        method: 'POST',
        body: { tool: toolName, arguments: args },
      })
      return res
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : `MCP call failed: ${server}/${toolName}`
      return null
    }
    finally {
      loading.value = false
    }
  }

  // ── CRM tools ────────────────────────────────────────────
  const crm = {
    getLeads: (filters?: Record<string, string>) =>
      callTool('crm', 'get_leads', filters ?? {}),
    getLead: (id: string) =>
      callTool('crm', 'get_lead', { id }),
    getCampaignSummary: () =>
      callTool('crm', 'get_campaign_summary', {}),
    getSearchTerms: (campaign?: string) =>
      callTool('crm', 'get_search_terms', campaign ? { campaign } : {}),
    getNegativeKeywords: () =>
      callTool('crm', 'get_negative_keywords', {}),
    getRevenueSummary: () =>
      callTool('crm', 'get_revenue_summary', {}),
  }

  // ── Google Ads tools ─────────────────────────────────────
  const googleAds = {
    getCampaigns: () =>
      callTool('google-ads', 'get_campaigns', {}),
    getSearchTermReport: (campaignId?: string) =>
      callTool('google-ads', 'get_search_term_report', campaignId ? { campaignId } : {}),
    getKeywordPerformance: (campaignId: string) =>
      callTool('google-ads', 'get_keyword_performance', { campaignId }),
    uploadOfflineConversions: (conversions: unknown[]) =>
      callTool('google-ads', 'upload_offline_conversions', { conversions }),
    addNegativeKeywords: (keywords: string[], campaignId: string) =>
      callTool('google-ads', 'add_negative_keywords', { keywords, campaignId }),
  }

  // ── Meta (Facebook/Instagram) tools ──────────────────────
  const metaAds = {
    getCampaigns: () =>
      callTool('meta-ads', 'get_campaigns', {}),
    getAdSets: (campaignId?: string) =>
      callTool('meta-ads', 'get_ad_sets', campaignId ? { campaignId } : {}),
    getAds: (adSetId?: string) =>
      callTool('meta-ads', 'get_ads', adSetId ? { adSetId } : {}),
    getLeadForms: () =>
      callTool('meta-ads', 'get_lead_forms', {}),
    getLeadFormResponses: (formId: string) =>
      callTool('meta-ads', 'get_lead_form_responses', { formId }),
    getInsights: (objectId: string, level: string) =>
      callTool('meta-ads', 'get_insights', { objectId, level }),
  }

  // ── LinkedIn Ads tools ───────────────────────────────────
  const linkedinAds = {
    getCampaigns: () =>
      callTool('linkedin-ads', 'get_campaigns', {}),
    getLeadGenForms: () =>
      callTool('linkedin-ads', 'get_lead_gen_forms', {}),
    getLeadGenResponses: (formId: string) =>
      callTool('linkedin-ads', 'get_lead_gen_responses', { formId }),
    getAnalytics: (campaignId: string) =>
      callTool('linkedin-ads', 'get_analytics', { campaignId }),
  }

  return {
    loading, error,
    callTool,
    crm, googleAds, metaAds, linkedinAds,
  }
}
