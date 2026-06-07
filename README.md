# SSD Consulting CRM — Nuxt 3 Application

A full-stack CRM purpose-built for SSD Consulting's paid acquisition system.  
Tracks Google Ads + Social Media campaigns through a 9-stage lead pipeline with Claude-powered AI agents.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Nuxt 3 (Vue 3, TypeScript) |
| Styling | Tailwind CSS |
| State | Pinia |
| Database | Supabase (PostgreSQL) |
| AI | Anthropic SDK — Claude Opus 4.6 / Sonnet / Haiku |
| MCP | `@modelcontextprotocol/sdk` |
| Charts | Chart.js |
| Deploy | Vercel (Nitro preset) |

---

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd ssd-crm
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```
# Required for AI features
ANTHROPIC_API_KEY=sk-ant-...

# Required for database
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJ...          # anon key (public)
SUPABASE_SERVICE_KEY=eyJ...  # service_role key (server-only)

# Optional — enables real Google Ads data (mock used if absent)
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=

# Optional — enables real Meta Ads data
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=

# Optional — enables real LinkedIn Ads data
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_AD_ACCOUNT_ID=
```

### 3. Initialize the database

In the Supabase dashboard, open the SQL editor and run:

```
supabase/migrations/001_initial.sql
```

This creates the `leads`, `search_terms`, `negative_keywords`, and `audit_sessions` tables and seeds initial data.

### 4. Run locally

```bash
npm run dev
```

App runs at `http://localhost:3000`.

---

## Deploying to Vercel

```bash
npm install -g vercel
vercel
```

Add each `.env` variable as a Vercel Environment Variable in the project dashboard, then redeploy.

The `nuxt.config.ts` already sets `nitro.preset = 'vercel'`.

---

## AI Agents

All agents use Claude and require `ANTHROPIC_API_KEY`.  
**All recommendations require human approval — agents never auto-change campaigns or budgets.**

| Agent | Model | Endpoint |
|-------|-------|----------|
| Campaign Optimizer | claude-opus-4-6 | `POST /api/ai/analyze-campaigns` |
| Search Term Labeler | claude-sonnet-4-6 | `POST /api/ai/label-terms` |
| Lead Scorer | claude-haiku-4-5-20251001 | `POST /api/ai/score-lead` |
| Weekly Auditor | claude-opus-4-6 | `POST /api/ai/weekly-audit` |
| General Chat | claude-sonnet-4-6 | `POST /api/ai/chat` |

---

## MCP Servers

Each MCP server is exposed as an HTTP endpoint at `/api/mcp/:server`.  
When the corresponding API keys are absent, mock data is returned.

| Server | Endpoint | Real API |
|--------|----------|---------|
| CRM | `/api/mcp/crm` | Supabase |
| Google Ads | `/api/mcp/google-ads` | Google Ads API |
| Meta Ads | `/api/mcp/meta-ads` | Meta Graph API v20 |
| LinkedIn Ads | `/api/mcp/linkedin-ads` | LinkedIn REST API |

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Performance dashboard — KPIs, charts, campaign table |
| `/leads` | Pipeline kanban + list view with filters |
| `/leads/add` | Add new lead with UTM tracking fields |
| `/campaigns` | Google Ads + Social campaign cards with keyword tables |
| `/search-terms` | Search term labeling with AI auto-label |
| `/negative-keywords` | Negative keyword manager with bulk upload |
| `/social` | Facebook / Instagram / LinkedIn campaign tracker + content calendar |
| `/weekly-audit` | 6-step manual checklist + AI audit report |

---

## Lead Pipeline Stages

```
New Lead → Contacted → Booked Consultation → Qualified →
Proposal Sent → Purchased Course → Became Consulting Client
                              ↓
                       Not a Fit / Lost/No Response
```

---

## UTM Tracking Reference

### Google Ads
```
utm_source=google&utm_medium=cpc&utm_campaign={campaign}&utm_term={keyword}&utm_content={ad}
```

### Facebook / Instagram
```
utm_source=facebook&utm_medium=paid_social&utm_campaign={campaign}&utm_content={ad_name}
```

### LinkedIn
```
utm_source=linkedin&utm_medium=paid_social&utm_campaign={campaign}&utm_content={ad_name}
```

---

## Offline Conversion Upload (Google Ads)

When a lead becomes a paying client:

1. Retrieve their GCLID from the lead record
2. In the Weekly Audit page, complete Step 6
3. Use the Google Ads MCP tool (`upload_offline_conversions`) — **dry_run first**
4. After human review, set `dry_run: false` and resubmit
5. Google Ads will attribute the revenue back to the originating keyword

---

## Adding Real API Credentials Later

The app works without any API keys (mock data everywhere).  
To go live:

1. **Supabase** — create a project, run the migration SQL, add URL + keys to `.env`
2. **Anthropic** — create API key at console.anthropic.com, add to `ANTHROPIC_API_KEY`
3. **Google Ads** — obtain developer token + OAuth credentials from Google Ads API Center
4. **Meta** — create a Meta App, generate a long-lived System User token
5. **LinkedIn** — create a LinkedIn App with Marketing API access, generate an access token

---

## Project Structure

```
ssd-crm/
├── agents/                   # Claude AI agents
│   ├── CampaignOptimizerAgent.ts
│   ├── SearchTermAgent.ts
│   ├── LeadScorerAgent.ts
│   └── WeeklyAuditAgent.ts
├── components/
│   ├── ai/AIPanel.vue        # Slide-in AI chat panel
│   └── leads/LeadModal.vue   # Lead detail + AI score modal
├── composables/
│   ├── useAI.ts              # AI feature composable
│   └── useMCP.ts             # MCP tool composable
├── layouts/
│   └── default.vue           # Nav + AI panel toggle
├── lib/
│   └── mockData.ts           # Mock campaign + social data
├── pages/
│   ├── index.vue             # Dashboard
│   ├── leads/index.vue       # Pipeline
│   ├── leads/add.vue         # Add lead form
│   ├── campaigns/index.vue   # Campaign performance
│   ├── search-terms/index.vue
│   ├── negative-keywords/index.vue
│   ├── social/index.vue
│   └── weekly-audit/index.vue
├── server/
│   ├── api/
│   │   ├── leads/            # CRUD endpoints
│   │   ├── ai/               # Agent endpoints
│   │   └── mcp/[server].post.ts  # MCP gateway
│   ├── mcp/                  # MCP server implementations
│   └── utils/                # Supabase + Anthropic clients
├── stores/
│   └── leads.ts              # Pinia leads store
├── supabase/
│   └── migrations/001_initial.sql
├── types/index.ts
├── nuxt.config.ts
└── .env.example
```
