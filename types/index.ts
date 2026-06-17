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
  | 'Sales Call'
  | 'Qualified'
  | 'Proposal Sent'
  | 'Contract Signed'
  | 'Contract Paid'
  | 'Purchased Course'
  | 'Became Consulting Client'
  | 'Not a Fit'
  | 'Lost/No Response'

export type LeadSource = 'google' | 'facebook' | 'instagram' | 'linkedin' | 'email' | 'organic' | 'bark' | ''

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
  assignee?: string
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
  id?: string
  created_at?: string
  updated_at?: string
  week_date?: string
  term: string
  campaign: string
  platform?: CampaignPlatform | string
  impressions: number
  clicks: number
  cost: number
  conversions: number
  label: SearchTermLabel | string
}

// ------------------------------------------------------------
// Negative Keywords
// DB-backed columns (category/platform/active) plus optional UI
// fields used by the Google Ads-style management page.
// ------------------------------------------------------------
export type NegativeKeywordMatchType = 'Broad' | 'Phrase' | 'Exact'
export type NegativeKeywordStatus = 'pending' | 'applied'

export interface NegativeKeyword {
  id: string
  created_at: string
  keyword: string
  category?: string
  platform?: string
  active?: boolean
  // UI-only (Google Ads management view)
  match_type?: NegativeKeywordMatchType | string
  campaign?: string
  reason?: string
  status?: NegativeKeywordStatus
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
  id?: string
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

export type SocialPostStatus = 'active' | 'paused' | 'draft' | 'scheduled' | 'published'

export interface SocialPost {
  id?: string
  title: string
  format: string
  status: SocialPostStatus
  reach?: number
  clicks?: number
  leads?: number
  engagement?: number
  date?: string
  publish_date?: string
}

export interface SocialUtmConfig {
  source: string
  medium: string
  click_param: string
  template?: string
  campaign?: string
  content?: string
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
  utm: SocialUtmConfig
  trackingNote: string
  posts: SocialPost[]
}

// ------------------------------------------------------------
// Email
// ------------------------------------------------------------
export interface EmailMessage {
  id: string
  created_at: string
  lead_id: string
  to_email: string
  from_email: string
  subject: string
  body: string
  status: 'sent' | 'failed'
  resend_id: string | null
  error: string | null
}

export interface EmailDraft {
  subject: string
  body: string
}

// Email Strategist Agent output — batch outreach plan
export interface EmailOutreachSuggestion {
  lead_id?: string
  lead_name: string
  lead_email: string
  lead_org?: string
  current_stage: string
  priority: 'high' | 'medium' | 'low'
  reason: string
  subject: string
  body: string
}

export interface EmailStrategyOutput {
  generated_at: string
  suggestions: EmailOutreachSuggestion[]
  segment_summary: string[]
  skipped: Array<{ lead_name: string; reason: string }>
  summary: string
  model_used: string
  tokens_used: number
}

// Social Media Agent output — per-platform recommendations + content ideas
export interface SocialRecommendation {
  area: 'audience' | 'budget' | 'creative' | 'format' | 'tracking'
  action: string
  priority: 'high' | 'medium' | 'low'
  rationale: string
}

export interface SocialPostIdea {
  title: string
  format: string
  hook: string
  audience: string
  cta: string
}

export interface SocialStrategyOutput {
  generated_at: string
  platform: 'fb' | 'ig' | 'li'
  health: 'strong' | 'moderate' | 'needs_attention'
  recommendations: SocialRecommendation[]
  post_ideas: SocialPostIdea[]
  scale_candidates: string[]
  pause_candidates: string[]
  summary: string
  model_used: string
  tokens_used: number
}

// ------------------------------------------------------------
// Sales Calls
// ------------------------------------------------------------
export type SalesCallOutcome = 'scheduled' | 'completed' | 'no_show' | 'rescheduled' | 'cancelled'

export interface SalesCall {
  id: string
  created_at: string
  lead_id: string | null
  lead_name?: string
  lead_org?: string
  scheduled_at: string
  duration_minutes: number
  outcome: SalesCallOutcome
  notes: string | null
  packages_discussed: string[] | null
  next_step: string | null
  created_by: string | null
}

// ------------------------------------------------------------
// Appointments
// ------------------------------------------------------------
export type AppointmentType = 'consultation' | 'sales_call' | 'follow_up' | 'other'
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export interface Appointment {
  id: string
  created_at: string
  lead_id: string | null
  lead_name?: string
  lead_org?: string
  title: string
  scheduled_at: string
  duration_minutes: number
  type: AppointmentType
  status: AppointmentStatus
  notes: string | null
  location: string | null
  created_by: string | null
}

// ------------------------------------------------------------
// Contracts
// ------------------------------------------------------------
export interface Contract {
  id: string
  created_at: string
  lead_id: string | null
  lead_name?: string
  lead_org?: string
  service: string
  value: number
  signed_at: string | null
  paid_at: string | null
  payment_method: string | null
  notes: string | null
  created_by: string | null
}

// ------------------------------------------------------------
// Email Campaigns
// ------------------------------------------------------------
export interface EmailCampaignFilter {
  stages: string[]
  sources: string[]
}

export interface EmailCampaign {
  id: string
  created_at: string
  updated_at: string
  name: string
  subject: string
  body: string
  status: 'draft' | 'sending' | 'sent' | 'failed'
  recipient_filter: EmailCampaignFilter
  recipient_count: number
  sent_at: string | null
  created_by: string | null
}

export interface EmailCampaignRecipient {
  id: string
  created_at: string
  campaign_id: string
  lead_id: string | null
  email: string
  lead_name: string | null
  status: 'pending' | 'sent' | 'failed'
  resend_id: string | null
  error: string | null
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
  | 'email_drafter'
  | 'email_strategist'
  | 'social_strategist'
  | 'crm_operations'

// CRM Operations Agent — action log entry returned alongside each reply
export interface CRMActionLog {
  tool: string
  summary: string
}

export interface CRMAgentResponse {
  reply: string
  actions: CRMActionLog[]
}

// ------------------------------------------------------------
// Content Publishing
// ------------------------------------------------------------
export type ContentType = 'post' | 'email' | 'carousel' | 'reel' | 'article'
export type ContentPlatform = 'linkedin' | 'facebook' | 'instagram' | 'email' | 'all'
export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived'
export type ContentOffer = 'gw101' | 'grants_consulting' | 'bh_consulting' | 'free_course' | 'general'
export type ContentTone = 'educational' | 'promotional' | 'testimonial' | 'story' | 'announcement'

export interface ContentItem {
  id: string
  created_at: string
  updated_at: string
  title: string
  body: string
  content_type: ContentType
  platform: ContentPlatform
  status: ContentStatus
  scheduled_at: string | null
  published_at: string | null
  topic: string | null
  offer: ContentOffer | null
  tone: ContentTone | null
  tags: string[]
  performance: ContentPerformance
  created_by: string | null
}

export interface ContentPerformance {
  likes?: number
  comments?: number
  shares?: number
  clicks?: number
  leads_generated?: number
}

export interface ContentItemInsert {
  title: string
  body: string
  content_type: ContentType
  platform: ContentPlatform
  status?: ContentStatus
  scheduled_at?: string | null
  topic?: string | null
  offer?: ContentOffer | null
  tone?: ContentTone | null
  tags?: string[]
}

// Output from ContentPublishingAgent
export interface GeneratedContent {
  platform: ContentPlatform
  title: string
  body: string
  content_type: ContentType
  tone: ContentTone
  hashtags?: string[]
  suggested_schedule?: string
  notes?: string
}

export interface ContentPublishResult {
  items: GeneratedContent[]
  strategy_notes: string
  model_used: string
}

// ------------------------------------------------------------
// A2A (Agent-to-Agent) Protocol
// ------------------------------------------------------------
export type A2AAgentId = 'crm_operations' | 'content_publisher'

export interface A2AMessage {
  from: A2AAgentId | string
  task: string
  payload: Record<string, unknown>
  context?: Record<string, unknown>
}

export interface A2AResponse {
  success: boolean
  agent: A2AAgentId | string
  result: unknown
  error?: string
}

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
