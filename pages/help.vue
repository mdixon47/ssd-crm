<template>
  <div class="p-6 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-cyan-400 mb-1">Help & Documentation</h1>
      <p class="text-sm text-slate-500">Everything you need to use the SSD Consulting CRM.</p>
    </div>

    <!-- Quick nav -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
      <a
        v-for="section in sections"
        :key="section.id"
        :href="`#${section.id}`"
        class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-cyan-400 transition-colors"
        style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)"
      >
        <span class="text-base leading-none">{{ section.icon }}</span>
        <span class="font-medium">{{ section.label }}</span>
      </a>
    </div>

    <div class="space-y-6">

      <!-- Dashboard -->
      <section :id="sections[0].id" class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-6 py-4 flex items-center gap-3" style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <span class="text-lg">📊</span>
          <h2 class="text-base font-bold text-slate-100">Dashboard</h2>
        </div>
        <div class="px-6 py-5 space-y-4 text-sm text-slate-400 leading-relaxed">
          <p>The dashboard gives you a real-time snapshot of your paid acquisition performance across all channels.</p>

          <div class="space-y-3">
            <div class="rounded-lg p-4" style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">KPI Cards</div>
              <ul class="space-y-1.5">
                <li><span class="text-slate-300 font-medium">Total Spend</span> — combined ad spend across Google, Facebook, Instagram, and LinkedIn.</li>
                <li><span class="text-slate-300 font-medium">Total Leads</span> — all leads generated this month across every campaign.</li>
                <li><span class="text-slate-300 font-medium">Cost / Lead (CPL)</span> — average spend per lead. Lower is better.</li>
                <li><span class="text-slate-300 font-medium">Total Revenue</span> — tracked revenue attributed to ad campaigns.</li>
                <li><span class="text-slate-300 font-medium">ROAS</span> — Return on Ad Spend (Revenue ÷ Spend). Green ≥ 3×, amber ≥ 1.5×, red below.</li>
              </ul>
            </div>

            <div class="rounded-lg p-4" style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Charts</div>
              <ul class="space-y-1.5">
                <li><span class="text-slate-300 font-medium">Revenue vs Spend</span> — bar chart comparing revenue (cyan) and spend (purple) per campaign.</li>
                <li><span class="text-slate-300 font-medium">Lead Funnel</span> — horizontal bars showing how leads progress from inquiry → qualified → booked → converted.</li>
              </ul>
            </div>

            <div class="rounded-lg p-4" style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">AI Weekly Audit</div>
              <p class="mb-2">Click <span class="text-cyan-400 font-medium">Run Weekly AI Audit</span> to have Claude analyze all campaign performance and surface actionable insights.</p>
              <ul class="space-y-1.5">
                <li>The audit assesses overall health as <span class="text-emerald-400">Strong</span>, <span class="text-amber-400">Moderate</span>, or <span class="text-red-400">Needs Attention</span>.</li>
                <li>It calls out campaigns to scale (positive ROAS trend) and campaigns to review (underperforming).</li>
                <li>Results appear inline — no page refresh needed.</li>
              </ul>
            </div>

            <div class="rounded-lg p-4" style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Campaign Table</div>
              <p>The table at the bottom lists every campaign with Spend, Leads, CPL, Revenue, ROAS, and a Signal badge (Scale ↑ / Hold / Review ⚠). Rows are color-coded by ROAS threshold.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Leads -->
      <section :id="sections[1].id" class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-6 py-4 flex items-center gap-3" style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <span class="text-lg">👥</span>
          <h2 class="text-base font-bold text-slate-100">Leads & Pipeline</h2>
        </div>
        <div class="px-6 py-5 space-y-4 text-sm text-slate-400 leading-relaxed">
          <p>Manage every contact from first touch through close. Switch between a Kanban pipeline view and a flat list view using the toggle in the top-right.</p>

          <div class="space-y-3">
            <div class="rounded-lg p-4" style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Adding a Lead</div>
              <ol class="space-y-1.5 list-decimal list-inside">
                <li>Click <span class="text-cyan-400 font-medium">+ Add Lead</span> in the top-right.</li>
                <li>Fill in name, organization, email, phone, source campaign, and initial stage.</li>
                <li>Save — the lead appears immediately in both views.</li>
              </ol>
            </div>

            <div class="rounded-lg p-4" style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Pipeline Stages</div>
              <p class="mb-2">Leads move through these stages in order:</p>
              <div class="flex flex-wrap gap-1.5">
                <span v-for="stage in pipelineStages" :key="stage" class="text-xs px-2 py-1 rounded-full text-slate-300" style="background:rgba(148,163,184,0.1)">{{ stage }}</span>
              </div>
              <p class="mt-2">Drag cards in pipeline view or use the stage dropdown in the lead detail modal to advance a lead.</p>
            </div>

            <div class="rounded-lg p-4" style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Filters</div>
              <ul class="space-y-1.5">
                <li><span class="text-slate-300 font-medium">Campaign</span> — narrow to a single Google or Social campaign.</li>
                <li><span class="text-slate-300 font-medium">Stage</span> — show only leads at a specific pipeline stage.</li>
                <li><span class="text-slate-300 font-medium">Search</span> — free-text search across name and organization.</li>
              </ul>
            </div>

            <div class="rounded-lg p-4" style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">AI Email Strategist</div>
              <p class="mb-2">The Email Strategist panel analyzes all leads and identifies who to reach out to next, ranked by urgency.</p>
              <ol class="space-y-1.5 list-decimal list-inside">
                <li>Optionally type a focus (e.g., "proposal follow-ups") in the text field.</li>
                <li>Click <span class="text-emerald-400 font-medium">Plan outreach</span>.</li>
                <li>Claude returns prioritized suggestions with a personalized email draft for each lead.</li>
                <li>Click <span class="text-slate-300 font-medium">Send email</span> on any suggestion to compose and send directly from the CRM.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <!-- Campaigns -->
      <section :id="sections[2].id" class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-6 py-4 flex items-center gap-3" style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <span class="text-lg">📢</span>
          <h2 class="text-base font-bold text-slate-100">Campaigns</h2>
        </div>
        <div class="px-6 py-5 space-y-3 text-sm text-slate-400 leading-relaxed">
          <p>The Campaigns page breaks down performance for each active Google Ads campaign.</p>
          <ul class="space-y-1.5">
            <li>Each campaign card shows Spend, Leads, CPL, Revenue, and ROAS for the current period.</li>
            <li>ROAS is color-coded — green ≥ 3×, amber ≥ 1.5×, red below 1.5×.</li>
            <li>Use this page to identify which campaigns to scale, hold, or pause before your next budget review.</li>
          </ul>
        </div>
      </section>

      <!-- Search Terms -->
      <section :id="sections[3].id" class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-6 py-4 flex items-center gap-3" style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <span class="text-lg">🔍</span>
          <h2 class="text-base font-bold text-slate-100">Search Terms</h2>
        </div>
        <div class="px-6 py-5 space-y-3 text-sm text-slate-400 leading-relaxed">
          <p>Inspect the actual search queries triggering your Google Ads, ranked by spend and conversion impact.</p>
          <ul class="space-y-1.5">
            <li>High-converting terms are candidates for exact-match keywords or separate ad groups.</li>
            <li>Irrelevant terms with spend and no conversions should be added as negative keywords.</li>
            <li>Use the search bar to filter terms and find patterns quickly.</li>
          </ul>
        </div>
      </section>

      <!-- Negative Keywords -->
      <section :id="sections[4].id" class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-6 py-4 flex items-center gap-3" style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <span class="text-lg">🚫</span>
          <h2 class="text-base font-bold text-slate-100">Negative Keywords</h2>
        </div>
        <div class="px-6 py-5 space-y-3 text-sm text-slate-400 leading-relaxed">
          <p>Track and manage your negative keyword lists to prevent wasted spend on irrelevant searches.</p>
          <ul class="space-y-1.5">
            <li>Add negative keywords here to document them before pushing to Google Ads.</li>
            <li>Group by campaign or apply at the account level for broad exclusions.</li>
            <li>Review this list weekly alongside the Search Terms page — any irrelevant term found there should appear here.</li>
          </ul>
        </div>
      </section>

      <!-- Weekly Audit -->
      <section :id="sections[5].id" class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-6 py-4 flex items-center gap-3" style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <span class="text-lg">✅</span>
          <h2 class="text-base font-bold text-slate-100">Weekly Audit</h2>
        </div>
        <div class="px-6 py-5 space-y-3 text-sm text-slate-400 leading-relaxed">
          <p>A structured checklist for your weekly paid acquisition review. Work through each section to maintain account health.</p>
          <div class="rounded-lg p-4 space-y-2" style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)">
            <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Recommended workflow</div>
            <ol class="space-y-1.5 list-decimal list-inside">
              <li>Review Search Terms — add irrelevant queries to negatives.</li>
              <li>Check campaign ROAS — adjust budgets on the Campaigns page.</li>
              <li>Advance stale leads in the pipeline — move anything untouched for 5+ days.</li>
              <li>Run the AI Audit from the Dashboard for a summary and scaled recommendations.</li>
              <li>Mark checklist items complete as you go.</li>
            </ol>
          </div>
        </div>
      </section>

      <!-- Social Media -->
      <section :id="sections[6].id" class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-6 py-4 flex items-center gap-3" style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <span class="text-lg">📱</span>
          <h2 class="text-base font-bold text-slate-100">Social Media</h2>
        </div>
        <div class="px-6 py-5 space-y-3 text-sm text-slate-400 leading-relaxed">
          <p>Performance overview for Facebook, Instagram, and LinkedIn paid campaigns.</p>
          <ul class="space-y-1.5">
            <li>Each platform tab shows campaign-level Spend, Leads, CPL, and ROAS.</li>
            <li>Compare channels side-by-side to decide where to shift budget.</li>
            <li>Social leads feed into the same pipeline as Google leads — filter by campaign on the Leads page to segment them.</li>
          </ul>
        </div>
      </section>

      <!-- AI Assistant -->
      <section :id="sections[7].id" class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-6 py-4 flex items-center gap-3" style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <span class="text-lg">✨</span>
          <h2 class="text-base font-bold text-slate-100">AI Assistant</h2>
        </div>
        <div class="px-6 py-5 space-y-4 text-sm text-slate-400 leading-relaxed">
          <p>The AI Assistant is available from any page via the <span class="text-cyan-400 font-medium">AI Assistant</span> button in the sidebar. It slides in as a panel on the right without leaving your current view.</p>

          <div class="space-y-3">
            <div class="rounded-lg p-4" style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">What you can ask</div>
              <ul class="space-y-1.5">
                <li>"Which campaigns have the best ROAS this month?"</li>
                <li>"Write a follow-up email for [lead name] who went cold after the proposal."</li>
                <li>"Summarize this week's search term waste."</li>
                <li>"What budget should I shift from Facebook to Google based on current ROAS?"</li>
                <li>"Draft a negative keyword list from these search terms: …"</li>
              </ul>
            </div>

            <div class="rounded-lg p-4" style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Tips</div>
              <ul class="space-y-1.5">
                <li>The assistant has context about your campaigns and leads — you don't need to paste data.</li>
                <li>Be specific about the outcome you want (e.g., "a 3-sentence email" vs "an email").</li>
                <li>Each conversation starts fresh — if context from a prior session matters, briefly restate it.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Account -->
      <section :id="sections[8].id" class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-6 py-4 flex items-center gap-3" style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <span class="text-lg">👤</span>
          <h2 class="text-base font-bold text-slate-100">Account Settings</h2>
        </div>
        <div class="px-6 py-5 space-y-3 text-sm text-slate-400 leading-relaxed">
          <p>Access your account settings by clicking your name in the bottom-left of the sidebar, or navigating to <NuxtLink to="/account" class="text-cyan-400 hover:text-cyan-300">Account</NuxtLink>.</p>
          <ul class="space-y-1.5">
            <li><span class="text-slate-300 font-medium">Display name</span> — update the name shown in the sidebar. Email cannot be changed here.</li>
            <li><span class="text-slate-300 font-medium">Password</span> — change your password by entering your current password first, then the new one (min 8 characters).</li>
            <li><span class="text-slate-300 font-medium">Sign out</span> — available from the sidebar bottom. You'll be redirected to the login page.</li>
          </ul>
          <p class="text-slate-500 text-xs">To add or remove team members, contact your administrator — user management is handled via the Supabase dashboard.</p>
        </div>
      </section>

      <!-- FAQ -->
      <section :id="sections[9].id" class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-6 py-4 flex items-center gap-3" style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <span class="text-lg">💬</span>
          <h2 class="text-base font-bold text-slate-100">FAQ</h2>
        </div>
        <div class="px-6 py-5 space-y-4 text-sm text-slate-400 leading-relaxed">
          <div
            v-for="faq in faqs"
            :key="faq.q"
            class="rounded-lg p-4"
            style="background:#080e1c;border:1px solid rgba(148,163,184,0.07)"
          >
            <div class="text-slate-200 font-medium mb-1.5">{{ faq.q }}</div>
            <div>{{ faq.a }}</div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
const sections = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'leads', label: 'Leads & Pipeline', icon: '👥' },
  { id: 'campaigns', label: 'Campaigns', icon: '📢' },
  { id: 'search-terms', label: 'Search Terms', icon: '🔍' },
  { id: 'negative-keywords', label: 'Negative Keywords', icon: '🚫' },
  { id: 'weekly-audit', label: 'Weekly Audit', icon: '✅' },
  { id: 'social', label: 'Social Media', icon: '📱' },
  { id: 'ai-assistant', label: 'AI Assistant', icon: '✨' },
  { id: 'account', label: 'Account', icon: '👤' },
  { id: 'faq', label: 'FAQ', icon: '💬' },
]

const pipelineStages = [
  'New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost',
]

const faqs = [
  {
    q: 'Is the campaign and lead data live or demo data?',
    a: 'Campaign performance numbers on the Dashboard, Campaigns, Search Terms, and Social pages currently use mock data for demonstration. Lead data entered via the Add Lead form is real and persisted in the database.',
  },
  {
    q: 'Why does the AI Audit say the same thing each time?',
    a: 'The audit analyzes the current mock campaign dataset. When live Google Ads and social data is connected, each audit will reflect real performance changes.',
  },
  {
    q: 'Can multiple team members use the CRM at the same time?',
    a: 'Yes. Each team member has their own login. Lead data is shared across accounts in real time via Supabase.',
  },
  {
    q: 'I forgot my password. How do I reset it?',
    a: 'Contact your administrator. They can trigger a password reset email from the Supabase dashboard under Authentication → Users.',
  },
  {
    q: 'The AI Assistant isn\'t responding. What should I do?',
    a: 'Check that the ANTHROPIC_API_KEY environment variable is set in your deployment. If you\'re running locally, confirm it\'s in your .env file and restart the dev server.',
  },
  {
    q: 'How do I connect real Google Ads data?',
    a: 'Set the GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN, and GOOGLE_ADS_CUSTOMER_ID environment variables. See .env.example for details.',
  },
]
</script>
