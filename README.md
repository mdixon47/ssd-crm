# SSD Consulting CRM — Nuxt 3 Application

A full-stack CRM purpose-built for SSD Consulting's paid acquisition system.
Tracks Google Ads, Meta, LinkedIn, and email/content campaigns through the SSD lead
pipeline, with a fleet of Claude-powered AI agents that analyze performance, score
leads, draft outreach, and publish content — all advisory, with **human approval
required before anything is changed or sent**.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Nuxt 3 (Vue 3, TypeScript) + Nitro |
| Styling | Tailwind CSS |
| State | Pinia |
| Database | Supabase (PostgreSQL + Row-Level Security) |
| AI | Anthropic SDK — Claude Haiku 4.5 (all agents) |
| MCP | `@modelcontextprotocol/sdk` |
| Analytics | Google Analytics 4 (Data API) |
| Email | Resend |
| Video | Remotion (separate project in `marketing/video/`) |
| Charts | Chart.js |
| Deploy | Netlify (Nitro `netlify` preset) |

> **Why Haiku everywhere?** The Netlify serverless function timeout is capped at 26s.
> Every agent runs on `claude-haiku-4-5-20251001` with bounded `max_tokens` to fit
> inside that wall. Sonnet and Opus are registered in `lib/models.ts` for future use
> but are not currently wired to any agent.

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

The app runs entirely on **mock data** with only `ANTHROPIC_API_KEY` and the Supabase
keys set. Every external integration (Google Ads, Meta, LinkedIn, GA4, Resend) falls
back to mock data when its keys are absent.

```
# ── Anthropic (required for all AI agents) ──
ANTHROPIC_API_KEY=sk-ant-...

# ── Supabase (required for database) ──
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJ...           # anon key (public)
SUPABASE_SERVICE_KEY=eyJ...   # service_role key (server-only)

# ── Resend (email sending) ──
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# ── Google Ads MCP (optional — mock if unset) ──
GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=

# ── Meta (Facebook/Instagram) Ads MCP (optional) ──
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=

# ── LinkedIn Ads MCP (optional) ──
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_AD_ACCOUNT_ID=

# ── Google Analytics 4 (optional — mock if unset) ──
GA4_PROPERTY_ID=
GA4_CLIENT_EMAIL=
GA4_PRIVATE_KEY=

# ── Machine-to-machine secrets ──
NUXT_A2A_SECRET=     # Bearer token for /api/a2a/*
NUXT_CRON_SECRET=    # Bearer token for /api/cron/* (also a GitHub Actions secret)
```

See `.env.example` for the full, commented list (including optional AI-media keys used
by the Remotion pipeline).

### 3. Initialize the database

In the Supabase dashboard, open the SQL editor and run the migrations in
`supabase/migrations/` **in numeric order** (`001` → `010`). See
[Database Migrations](#database-migrations) below.

### 4. Run locally

```bash
npm run dev
```

App runs at `http://localhost:3000`.

### Other scripts

```bash
npm run build       # production build
npm run preview     # preview the production build
npm run lint        # ESLint
npm run typecheck   # nuxt typecheck (marketing/ excluded)
npm run test        # vitest run
```

---

## Deploying to Netlify

The repo ships with `netlify.toml` preconfigured:

- Build command: `npx nuxt prepare && npm run build`, publish dir `dist`
- `NITRO_PRESET=netlify` for production, deploy-preview, and branch-deploy contexts
- `[functions.server]` `timeout = 26` — the SSR function timeout is raised from
  Netlify's 10s default so AI agent routes can finish
- `NODE_OPTIONS=--max-old-space-size=4096` to avoid OOM on large Nuxt/Vite builds
- `SECRETS_SCAN_OMIT_KEYS=GA4_PROPERTY_ID,PROJECT_ID` — these are non-sensitive
  identifiers that would otherwise trip Netlify's secrets scanner (see `docs/issues.md`)

Add every `.env` variable as a Netlify environment variable in the site dashboard,
then deploy. `nuxt.config.ts` defaults the Nitro preset to `vercel`, which the
`NITRO_PRESET` env var overrides on Netlify — Vercel still works as a fallback target.

---

## AI Agents

All agents run on **Claude Haiku 4.5** and require `ANTHROPIC_API_KEY`.
**Every recommendation requires human approval — agents never auto-change campaigns,
budgets, or send anything without review.**

| Agent | Role | Endpoint |
|-------|------|----------|
| Campaign Optimizer | Analyzes spend/leads/ROAS, recommends scaling or pausing | `POST /api/ai/analyze-campaigns` |
| Search Term Labeler | Labels Google Ads queries (keep/watch/negative/build_page/new_campaign) | `POST /api/ai/label-terms` |
| Lead Scorer | Scores leads 1–10 and tiers them (A–D) | `POST /api/ai/score-lead` |
| Lead Extractor | Extracts structured lead fields from raw email bodies | `POST /api/leads/extract` |
| CRM Operations | Natural-language orchestrator over leads, emails, follow-ups (agentic loop) | `POST /api/ai/crm-agent` |
| Email Agent | Drafts personalized outreach emails from CRM context | `POST /api/email/draft` |
| Email Strategist | Plans batch outreach, prioritizes by stage/dormancy (read-only) | `POST /api/ai/email-strategy` |
| Social Media | Per-platform performance analysis + fresh post ideas | `POST /api/ai/social-strategy` |
| Content Publishing | Generates platform-optimized content in parallel | `POST /api/ai/content-create` |
| Weekly Auditor | Full weekly audit across all MCP sources + GA4 (read-only) | `POST /api/ai/weekly-audit` |
| General Chat | Conversational AI over the CRM | `POST /api/ai/chat` |

Agent implementations live in `agents/`. The model registry is `lib/models.ts`.

---

## MCP Servers

Each MCP server is exposed via the router endpoint `POST /api/mcp/:server`.
When the corresponding API keys are absent, mock data is returned.

| Server | `:server` | Real API |
|--------|-----------|----------|
| CRM | `crm` | Supabase |
| Google Ads | `google-ads` | Google Ads API |
| Google Analytics | `google-analytics` | GA4 Data API |
| Meta Ads | `meta-ads` | Meta Graph API v20 |
| LinkedIn Ads | `linkedin-ads` | LinkedIn REST API |

Implementations live in `server/mcp/`.

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Performance dashboard — KPIs, AI weekly-audit result, scaling recommendations |
| `/leads` | Pipeline kanban + list view with campaign filters |
| `/leads/add` | Add a lead manually or via email extraction |
| `/campaigns` | Tabbed campaigns — Google Ads / Social / Email |
| `/search-terms` | Search-term labeling with AI auto-label |
| `/negative-keywords` | Negative keyword manager with bulk upload |
| `/social` | Per-platform (FB/IG/LinkedIn) tracker + AI strategist |
| `/content` | Content hub — AI publishing for LinkedIn/FB/IG/Email |
| `/analytics` | Website analytics — GA4 live data (or mock) |
| `/appointments` | Schedule and manage appointments |
| `/sales-calls` | Log and track sales calls |
| `/contracts` | Track signed/paid contracts and revenue |
| `/weekly-audit` | Audit checklist + AI audit report |
| `/pricing` | Editable sales-call pricing sheet |
| `/account` | Profile, email, connected integrations |
| `/help` | In-app help and navigation |
| `/login` | Authentication |

---

## Server API

Beyond the AI and MCP routes above, the Nitro server exposes:

| Area | Routes |
|------|--------|
| Leads | `GET/POST /api/leads`, `PATCH /api/leads/:id`, `POST /api/leads/extract` |
| Email | `POST /api/email/send`, `POST /api/email/draft`, `POST /api/email/log`, `GET /api/email/:leadId` |
| Email campaigns | `GET/POST /api/email-campaigns`, `GET/DELETE /api/email-campaigns/:id`, `POST /api/email-campaigns/:id/send`, `POST /api/email-campaigns/preview` |
| Content | `GET/POST /api/content`, `PATCH/DELETE /api/content/:id` |
| Appointments | `GET/POST /api/appointments`, `PATCH/DELETE /api/appointments/:id` |
| Sales calls | `GET/POST /api/sales-calls`, `PATCH /api/sales-calls/:id` |
| Contracts | `GET/POST /api/contracts`, `PATCH /api/contracts/:id` |
| Analytics | `GET /api/analytics` |
| Cron | `GET /api/cron/publish-scheduled` (requires `NUXT_CRON_SECRET`) |
| Agent-to-agent | `POST /api/a2a/:agent` (requires `NUXT_A2A_SECRET`) |

Email is sent through **Resend** (`POST /api/email/send`) and each message is persisted
to the `email_messages` table. Outreach is draft-first: agents draft, a human reviews,
then sends.

---

## Lead Pipeline Stages

```
New Lead → Contacted → Booked Consultation → Qualified →
Proposal Sent → Purchased Course → Became Consulting Client
                              ↓
                       Not a Fit / Lost / No Response
```

---

## Scheduled Content Publishing

Content items (LinkedIn / Facebook / Instagram / Email) can be scheduled. A GitHub
Actions workflow (`cron-publish.yml`) pings `GET /api/cron/publish-scheduled` every
15 minutes with the `NUXT_CRON_SECRET` Bearer token to publish anything due. The
endpoint is a no-op when nothing is scheduled.

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
2. In the Weekly Audit page, complete the offline-conversion step
3. Use the Google Ads MCP tool (`upload_offline_conversions`) — **dry_run first**
4. After human review, set `dry_run: false` and resubmit
5. Google Ads attributes the revenue back to the originating keyword

---

## Adding Real API Credentials Later

The app works without any optional API keys (mock data everywhere). To go live:

1. **Supabase** — create a project, run the migrations, add URL + keys to `.env`
2. **Anthropic** — create an API key at console.anthropic.com → `ANTHROPIC_API_KEY`
3. **Resend** — create an API key and verify a sending domain → `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
4. **Google Ads** — obtain a developer token + OAuth credentials from the Google Ads API Center
5. **Meta** — create a Meta App, generate a long-lived System User token
6. **LinkedIn** — create a LinkedIn App with Marketing API access, generate an access token
7. **GA4** — create a GCP service account with Analytics read access → `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY`

See `docs/live-data.md` for the detailed integration guide.

---

## Database Migrations

Run in numeric order in the Supabase SQL editor:

| File | Adds |
|------|------|
| `001_initial.sql` | `leads`, `campaigns`, `search_terms`, `negative_keywords` (+ seed data) |
| `002_email_messages.sql` | Email message history |
| `003_enable_rls.sql` | Row-level security |
| `004_lead_assignee.sql` | Lead assignee field |
| `005_admin_users.sql` | Admin user management |
| `006_profiles.sql` | User profiles |
| `007_rls_multi_user.sql` | Multi-user RLS policies |
| `008_email_campaigns.sql` | Email campaign scheduling |
| `009_sales_calls_appointments_contracts.sql` | Sales calls, appointments, contracts |
| `010_content_items.sql` | Content items (LinkedIn/FB/IG/Email) |
| `011_email_conversations.sql` | Two-way email threads (message `direction`) |

---

## CI/CD

GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | push to `main`, PRs, manual | Lint → typecheck → test → build |
| `cron-publish.yml` | every 15 min, manual | Publish scheduled content via the cron endpoint |
| `security.yml` | push/PR, weekly, manual | CodeQL + Gitleaks secret scan + npm audit (high/critical) |

---

## Video Marketing (Remotion)

`marketing/` is a **self-contained Remotion project** (`marketing/video/`) with its own
`package.json` and `tsconfig.json`. It generates SSD Consulting ad/hero/hook videos and
is intentionally excluded from the Nuxt lint/typecheck/build. See
`marketing/video-marketing-strategy.md`.

---

## Project Structure

```
ssd-crm/
├── agents/                       # Claude AI agents (all on Haiku 4.5)
│   ├── CampaignOptimizerAgent.ts
│   ├── CRMOperationsAgent.ts
│   ├── EmailAgent.ts
│   ├── EmailStrategistAgent.ts
│   ├── LeadExtractorAgent.ts
│   ├── LeadScorerAgent.ts
│   ├── SearchTermAgent.ts
│   ├── SocialMediaAgent.ts
│   ├── ContentPublishingAgent.ts
│   └── WeeklyAuditAgent.ts
├── components/
│   ├── ai/AIPanel.vue            # Slide-in AI chat panel
│   ├── campaigns/EmailCampaignModal.vue
│   └── leads/{LeadModal,EmailComposer}.vue
├── composables/
│   ├── useAI.ts                  # AI feature composable
│   ├── useAuth.ts                # Auth state
│   └── useMCP.ts                 # MCP tool composable
├── lib/
│   ├── models.ts                 # Claude model registry
│   └── mockData.ts               # Mock campaign/lead/social data
├── pages/                        # See Pages table above
├── server/
│   ├── api/
│   │   ├── ai/                   # Agent endpoints
│   │   ├── leads/                # Lead CRUD + extract
│   │   ├── email/                # Resend send/draft/history
│   │   ├── email-campaigns/      # Campaign scheduling + send
│   │   ├── content/              # Content items CRUD
│   │   ├── appointments/  sales-calls/  contracts/
│   │   ├── analytics/            # GA4-backed dashboard data
│   │   ├── cron/                 # Scheduled-publish trigger
│   │   ├── a2a/                  # Agent-to-agent gateway
│   │   └── mcp/[server].post.ts  # MCP router
│   ├── mcp/                      # MCP server implementations
│   └── utils/                    # Supabase + Anthropic clients
├── stores/leads.ts               # Pinia leads store
├── supabase/migrations/          # 001 … 010
├── marketing/video/              # Remotion project (isolated)
├── docs/                         # SECURITY, devsecops, live-data, issues, …
├── types/index.ts
├── nuxt.config.ts
├── netlify.toml
└── .env.example
```
