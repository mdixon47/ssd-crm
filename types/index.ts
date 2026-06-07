// ============================================================
// SSD Consulting CRM — Core TypeScript Types
// ============================================================

// ------------------------------------------------------------
// Leads
// ------------------------------------------------------------
export type LeadStage =
  | 'New Lead'
  | 'Contacted'
  | 'Booked Consultation'
  | 'Qualified'
  | 'Proposal Sent'
  | 'Purchased Course'
  | 'Became Consulting Client'
  | 'Not a Fit'
  | 'Lost/No Response'

export type LeadSource = 'google' | 'facebook' | 'instagram' | 'linkedin' | 'email' | 'organic' | ''

export type QualifiedStatus = 'yes' | 'no' | 'partial' | ''

export interface Lead {
  id: string
  created_at: string
  updated_at: string
  fname: string
  lname: string
  email: string
  phone?: string
  org: string
  title?: string
  interest?: string
  stage: LeadStage
  qualified: QualifiedStatus
  source?: LeadSource
  campaign?: string
  keyword?: string
  content?: string
  gclid?: string
  landing?: string
  revenue: number
  notes?: string
  lead_date: string
}

export type LeadInsert = Omit<Lead, 'id' | 'created_at' | 'updated_at'>
export type LeadUpdate = Partial<LeadInsert>

// ------------------------------------------------------------
// Campaigns
// ------------------------------------------------------------
export type CampaignPlatform = 'google' | 'facebook' | 'instagram' | 'linkedin'

export interface Campaign {
  id: string
  name: string
  platform: CampaignPlatform
  offer: string
  goal: string
  budgetShare: number
  color: string
  conversion: string
  spend: number
  leads: number
  qualified: number
  booked: number
  conversions: number
  revenue: number
  keywords: string[]
  status: 'active' | 'paused' | 'review'
}

export interface CampaignMetrics {
  spend: number
  leads: number
  qualified: number
  booked: number
  conversions: number
  revenue: number
  cpl: number
  roas: number
}

// ------------------------------------------------------------
// Search Terms
// ------------------------------------------------------------
export type SearchTermLabel =
  | 'keep'
  | 'watch'
  | 'negative'
  | 'build_page'
  | 'new_campaign'
  | ''

export interface SearchTerm {
  id: string
  created_at: string
  updated_at: string
  week_date: string
  term: string
  campaign: string
  platform: CampaignPlatform | 'google'
  impressions: number
  clicks: number
  cost: number
  conversions: number
  label: SearchTermLabel
}

// ------------------------------------------------------------
// Negative Keywords
// ------------------------------------------------------------
export interface NegativeKeyword {
  id: string
  created_at: string
  keyword: string
  category: string
  platform: string
  active: boolean
}

// ------------------------------------------------------------
// Audit
// ------------------------------------------------------------
export interface AuditSession {
  id: string
  created_at: string
  week_date: string
  status: 'in_progress' | 'complete'
  report: AuditReport | null
  checklist: Record<string, boolean>
}

export interface AuditReport {
  generated_at: string
  campaigns_to_scale: string[]
  campaigns_to_pause: string[]
  keywords_to_keep: string[]
  keywords_to_remove: string[]
  negative_keyword_suggestions: string[]
  landing_page_issues: string[]
  budget_recommendations: string[]
  tracking_issues: string[]
  questions_for_review: string[]
  summary: string
  overall_health: 'strong' | 'moderate' | 'needs_attention'
}

// ------------------------------------------------------------
// Social Media
// ------------------------------------------------------------
export interface SocialCampaign {
  name: string
  objective: string
  audience: string
  spend: number
  reach: number
  clicks: number
  leads: number
  cpl: number
  conversions: number
  revenue: number
  adFormat: string
  status: 'active' | 'paused'
  notes: string
}

export interface SocialPost {
  title: string
  format: string
  status: 'active' | 'paused' | 'draft'
  reach: number
  clicks: number
  leads: number
  date: string
}

export interface SocialPlatformData {
  name: string
  color: string
  bgClass: string
  icon: string
  tagline: string
  campaigns: SocialCampaign[]
  audiences: string[]
  adFormats: string[]
  utm: { source: string; medium: string; click_param: string }
  trackingNote: string
  posts: SocialPost[]
}

// ------------------------------------------------------------
// AI / MCP
// ------------------------------------------------------------
export type AgentType =
  | 'campaign_optimizer'
  | 'search_term_labeler'
  | 'lead_scorer'
  | 'weekly_audit'
  | 'ad_copy_generator'

export interface AgentRequest {
  type: AgentType
  payload: Record<string, unknown>
}

export interface AgentResponse {
  success: boolean
  data: unknown
  usage?: { input_tokens: number; output_tokens: number }
  error?: string
}

export interface MCPToolCall {
  name: string
  arguments: Record<string, unknown>
}

export interface MCPToolResult {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}

// ------------------------------------------------------------
// API Responses
// ------------------------------------------------------------
export interface ApiSuccess<T> {
  data: T
  error: null
}

export interface ApiError {
  data: null
  error: string
  code?: number
}

export type ApiResult<T> = ApiSuccess<T> | ApiError

// ------------------------------------------------------------
// Dashboard
// ------------------------------------------------------------
export interface KpiData {
  label: string
  value: string | number
  sub: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  highlight?: 'good' | 'warn' | 'bad'
}
