<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-cyan-400">Campaigns</h1>
    </div>

    <!-- Tab selector -->
    <div class="flex gap-1 mb-6 rounded-lg p-1 w-fit" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
      <button
        :class="['px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === 'google' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200']"
        @click="tab = 'google'"
      >
        🔍 Google Ads
      </button>
      <button
        :class="['px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === 'social' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200']"
        @click="tab = 'social'"
      >
        📱 Social Media
      </button>
      <button
        :class="['px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === 'email' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200']"
        @click="tab = 'email'"
      >
        📧 Email Campaigns
      </button>
    </div>

    <!-- Google Ads Campaigns -->
    <div v-if="tab === 'google'">
      <!-- Website analytics context (GA4) — joins paid traffic to on-site behavior -->
      <div v-if="gaChannels.length" class="rounded-xl p-5 mb-6" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-semibold text-slate-300">🌐 Website Traffic by Channel (GA4, 30d)</div>
          <NuxtLink to="/analytics" class="text-xs text-cyan-400 hover:text-cyan-300">Full analytics →</NuxtLink>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div v-for="c in gaTopChannels" :key="c.channel" class="rounded-lg px-3 py-2.5" style="background:#0b1120;border:1px solid rgba(148,163,184,0.07)">
            <div class="text-xs text-slate-500 mb-0.5 truncate">{{ c.channel }}</div>
            <div class="font-bold text-slate-100">{{ c.sessions.toLocaleString() }} <span class="text-xs font-normal text-slate-500">sessions</span></div>
            <div class="text-xs text-emerald-400 mt-0.5">{{ c.conversions.toLocaleString() }} conversions</div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div
          v-for="campaign in GOOGLE_CAMPAIGNS"
          :key="campaign.id"
          class="rounded-xl overflow-hidden"
          style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)"
        >
          <div class="px-5 py-4 flex items-center justify-between" style="border-bottom:1px solid rgba(148,163,184,0.07)">
            <div>
              <div class="font-bold text-slate-100">{{ campaign.name }}</div>
              <div class="text-xs text-slate-500 mt-0.5">{{ campaign.status }} · Google Ads</div>
            </div>
            <span
              class="text-xs px-2.5 py-1 rounded-full font-semibold"
              :class="signalClass(campaign.revenue / campaign.spend)"
            >
              {{ roasSignal(campaign.revenue / campaign.spend) }}
            </span>
          </div>

          <div class="grid grid-cols-3 text-center" style="border-bottom:1px solid rgba(148,163,184,0.07)">
            <div class="px-4 py-3" style="border-right:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs text-slate-500 mb-0.5">Spend</div>
              <div class="font-bold text-slate-100">${{ campaign.spend.toLocaleString() }}</div>
            </div>
            <div class="px-4 py-3" style="border-right:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs text-slate-500 mb-0.5">Leads</div>
              <div class="font-bold text-slate-100">{{ campaign.leads }}</div>
            </div>
            <div class="px-4 py-3">
              <div class="text-xs text-slate-500 mb-0.5">Revenue</div>
              <div class="font-bold text-emerald-400">${{ campaign.revenue.toLocaleString() }}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 text-center" style="border-bottom:1px solid rgba(148,163,184,0.07)">
            <div class="px-4 py-2.5" style="border-right:1px solid rgba(148,163,184,0.07)">
              <div class="text-xs text-slate-500 mb-0.5">CPL</div>
              <div class="font-semibold text-slate-300">${{ (campaign.spend / campaign.leads).toFixed(0) }}</div>
            </div>
            <div class="px-4 py-2.5">
              <div class="text-xs text-slate-500 mb-0.5">ROAS</div>
              <div
                class="font-bold"
                :class="campaign.revenue / campaign.spend >= 3 ? 'text-emerald-400' : campaign.revenue / campaign.spend >= 1.5 ? 'text-amber-400' : 'text-red-400'"
              >
                {{ (campaign.revenue / campaign.spend).toFixed(2) }}x
              </div>
            </div>
          </div>

          <!-- Keywords -->
          <div v-if="campaign.keywords?.length" class="px-5 py-3" style="border-bottom:1px solid rgba(148,163,184,0.07)">
            <div class="text-xs font-semibold text-slate-500 uppercase mb-2">Top Keywords</div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="kw in campaign.keywords.slice(0, 6)"
                :key="kw"
                class="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full"
              >{{ kw }}</span>
            </div>
          </div>

          <!-- UTM -->
          <div class="px-5 py-3" style="background:#080e1c">
            <div class="text-xs font-semibold text-slate-500 uppercase mb-1.5">UTM Template</div>
            <code class="text-xs text-slate-500 break-all leading-relaxed">
              utm_source=google&utm_medium=cpc&utm_campaign={{ encodeUTM(campaign.name) }}&utm_term={keyword}
            </code>
          </div>
        </div>
      </div>

      <!-- Keyword Bids Table -->
      <div class="rounded-xl overflow-hidden" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
        <div class="px-5 py-4" style="border-bottom:1px solid rgba(148,163,184,0.08)">
          <div class="font-semibold text-slate-100">Keyword Performance Overview</div>
          <div class="text-xs text-slate-500 mt-0.5">From mock data — connect Google Ads API for live data</div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead style="background:#080e1c">
              <tr>
                <th class="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Keyword</th>
                <th class="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Campaign</th>
                <th class="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Impressions</th>
                <th class="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Clicks</th>
                <th class="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">CTR</th>
                <th class="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Conv.</th>
                <th class="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Cost</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/30">
              <tr v-for="kw in MOCK_KEYWORDS" :key="kw.keyword" class="hover:bg-cyan-500/5 transition-colors">
                <td class="px-4 py-2.5 font-medium text-slate-200">{{ kw.keyword }}</td>
                <td class="px-4 py-2.5 text-slate-500 text-xs">{{ kw.campaign }}</td>
                <td class="px-4 py-2.5 text-right text-slate-400">{{ kw.impressions.toLocaleString() }}</td>
                <td class="px-4 py-2.5 text-right text-slate-400">{{ kw.clicks }}</td>
                <td class="px-4 py-2.5 text-right text-slate-500">{{ kw.ctr }}%</td>
                <td class="px-4 py-2.5 text-right font-semibold" :class="kw.conversions > 0 ? 'text-emerald-400' : 'text-slate-600'">{{ kw.conversions }}</td>
                <td class="px-4 py-2.5 text-right text-slate-400">${{ kw.cost }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Email Campaigns -->
    <div v-else-if="tab === 'email'">
      <div class="flex items-center justify-between mb-5">
        <p class="text-sm text-slate-500">Send personalized email campaigns to your leads via Resend.</p>
        <button
          class="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-semibold text-cyan-300 transition-all"
          style="background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.3)"
          @click="showComposer = true"
        >
          + New Campaign
        </button>
      </div>

      <!-- Toast -->
      <div v-if="toast" class="mb-4 rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2" :class="toast.type === 'success' ? 'text-emerald-300' : 'text-rose-300'" :style="toast.type === 'success' ? 'background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25)' : 'background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25)'">
        {{ toast.message }}
      </div>

      <!-- Loading -->
      <div v-if="loadingCampaigns" class="text-center py-16 text-slate-600 text-sm">Loading campaigns…</div>

      <!-- Empty state -->
      <div v-else-if="emailCampaigns.length === 0" class="rounded-xl p-12 text-center" style="background:#0d1628;border:1px solid rgba(148,163,184,0.08);border-style:dashed">
        <div class="text-3xl mb-3">📧</div>
        <p class="text-slate-400 font-medium mb-1">No email campaigns yet</p>
        <p class="text-slate-600 text-sm mb-5">Create your first campaign to send personalized emails to your leads.</p>
        <button
          class="text-sm px-4 py-2 rounded-lg font-semibold text-cyan-300"
          style="background:rgba(6,182,212,0.12);border:1px solid rgba(6,182,212,0.3)"
          @click="showComposer = true"
        >
          + New Campaign
        </button>
      </div>

      <!-- Campaign list -->
      <div v-else class="space-y-3">
        <div
          v-for="campaign in emailCampaigns"
          :key="campaign.id"
          class="rounded-xl overflow-hidden"
          style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)"
        >
          <!-- Campaign header row -->
          <div
            class="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-cyan-500/5 transition-colors"
            @click="toggleExpanded(campaign.id)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 flex-wrap">
                <span class="font-semibold text-slate-100">{{ campaign.name }}</span>
                <span
                  class="text-xs px-2 py-0.5 rounded-full font-semibold"
                  :class="statusClass(campaign.status)"
                >{{ campaign.status }}</span>
              </div>
              <div class="text-xs text-slate-500 mt-0.5 truncate">{{ campaign.subject }}</div>
            </div>
            <div class="text-right flex-shrink-0 hidden sm:block">
              <div v-if="campaign.status === 'sent'" class="text-xs text-slate-500">
                <span class="text-slate-300 font-medium">{{ campaign.recipient_count }}</span> sent
              </div>
              <div class="text-xs text-slate-600 mt-0.5">
                {{ campaign.sent_at ? formatDate(campaign.sent_at) : formatDate(campaign.created_at) }}
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button
                v-if="campaign.status === 'draft'"
                class="text-xs px-3 py-1.5 rounded-lg font-medium text-cyan-300 transition-colors"
                style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.25)"
                :disabled="sending === campaign.id"
                @click.stop="sendCampaign(campaign)"
              >
                {{ sending === campaign.id ? 'Sending…' : 'Send' }}
              </button>
              <button
                v-if="campaign.status === 'draft'"
                class="text-xs px-2.5 py-1.5 rounded-lg text-rose-400 hover:text-rose-300 transition-colors"
                style="border:1px solid rgba(248,113,113,0.2)"
                :disabled="deleting === campaign.id"
                @click.stop="deleteCampaign(campaign.id)"
              >
                Delete
              </button>
              <span class="text-slate-600 text-sm select-none">{{ expandedId === campaign.id ? '▲' : '▼' }}</span>
            </div>
          </div>

          <!-- Expanded recipients -->
          <div v-if="expandedId === campaign.id" style="border-top:1px solid rgba(148,163,184,0.07)">
            <div v-if="loadingRecipients" class="px-5 py-4 text-sm text-slate-600">Loading recipients…</div>
            <div v-else-if="expandedRecipients.length === 0" class="px-5 py-4 text-sm text-slate-600">
              {{ campaign.status === 'draft' ? 'Not yet sent — click Send to deliver this campaign.' : 'No recipients recorded.' }}
            </div>
            <div v-else class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead style="background:#080e1c">
                  <tr>
                    <th class="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Recipient</th>
                    <th class="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Email</th>
                    <th class="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th class="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Sent at</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-700/30">
                  <tr v-for="r in expandedRecipients" :key="r.id" class="hover:bg-cyan-500/3 transition-colors">
                    <td class="px-4 py-2.5 font-medium text-slate-300">{{ r.lead_name || '—' }}</td>
                    <td class="px-4 py-2.5 text-slate-500 text-xs">{{ r.email }}</td>
                    <td class="px-4 py-2.5 text-center">
                      <span class="text-xs px-2 py-0.5 rounded-full font-semibold" :class="r.status === 'sent' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'">
                        {{ r.status }}
                      </span>
                    </td>
                    <td class="px-4 py-2.5 text-right text-slate-600 text-xs">{{ formatDate(r.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Social Campaigns -->
    <div v-else>
      <div v-for="(platform, key) in SOCIAL_PLATFORMS" :key="key" class="mb-8">
        <div class="flex items-center gap-3 mb-4">
          <div class="text-2xl">{{ platformIcon(key) }}</div>
          <h2 class="text-lg font-bold text-slate-100">{{ platform.name }} Campaigns</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div
            v-for="campaign in platform.campaigns"
            :key="campaign.id"
            class="rounded-xl overflow-hidden"
            style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)"
          >
            <div class="px-5 py-4" style="border-bottom:1px solid rgba(148,163,184,0.07)">
              <div class="font-bold text-slate-100">{{ campaign.name }}</div>
              <div class="text-xs text-slate-500 mt-0.5">{{ campaign.objective }} · {{ campaign.status }}</div>
            </div>
            <div class="grid grid-cols-4 text-center text-sm" style="border-bottom:1px solid rgba(148,163,184,0.07)">
              <div class="px-3 py-2.5" style="border-right:1px solid rgba(148,163,184,0.07)">
                <div class="text-xs text-slate-500 mb-0.5">Spend</div>
                <div class="font-bold text-slate-200">${{ campaign.spend }}</div>
              </div>
              <div class="px-3 py-2.5" style="border-right:1px solid rgba(148,163,184,0.07)">
                <div class="text-xs text-slate-500 mb-0.5">Leads</div>
                <div class="font-bold text-slate-200">{{ campaign.leads }}</div>
              </div>
              <div class="px-3 py-2.5" style="border-right:1px solid rgba(148,163,184,0.07)">
                <div class="text-xs text-slate-500 mb-0.5">Revenue</div>
                <div class="font-bold text-emerald-400">${{ campaign.revenue }}</div>
              </div>
              <div class="px-3 py-2.5">
                <div class="text-xs text-slate-500 mb-0.5">ROAS</div>
                <div class="font-bold" :class="campaign.revenue / campaign.spend >= 2 ? 'text-emerald-400' : 'text-amber-400'">
                  {{ campaign.spend > 0 ? (campaign.revenue / campaign.spend).toFixed(1) : '—' }}x
                </div>
              </div>
            </div>
            <div class="px-5 py-3" style="background:#080e1c">
              <code class="text-xs text-slate-500 break-all">{{ (platform.utm.template ?? '').replace('{campaign}', campaign.name.toLowerCase().replace(/\s+/g, '_')) }}</code>
            </div>
          </div>
        </div>

        <div class="rounded-xl p-4" style="background:#0d1628;border:1px solid rgba(148,163,184,0.1)">
          <div class="text-xs font-semibold text-slate-500 uppercase mb-3">Ad Formats for {{ platform.name }}</div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="fmt in platform.adFormats"
              :key="fmt"
              class="text-xs bg-slate-700/40 text-slate-300 px-2.5 py-1 rounded-full"
            >{{ fmt }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Email Campaign Composer modal -->
    <EmailCampaignModal
      v-if="showComposer"
      @close="showComposer = false"
      @saved="onCampaignSaved"
      @sent="onCampaignSent"
    />
  </div>
</template>

<script setup lang="ts">
import EmailCampaignModal from '~/components/campaigns/EmailCampaignModal.vue'
import { GOOGLE_CAMPAIGNS, SOCIAL_PLATFORMS } from '~/lib/mockData'
import type { EmailCampaign, EmailCampaignRecipient, GAOverview, GAChannelStat } from '~/types'

const tab = ref<'google' | 'social' | 'email'>('google')

// Website analytics (GA4) shown alongside Google Ads campaigns.
const { data: gaData } = await useFetch<{ data: GAOverview }>('/api/analytics', {
  query: { range: 'LAST_30_DAYS' },
})
const gaChannels = computed<GAChannelStat[]>(() => gaData.value?.data.channels ?? [])
const gaTopChannels = computed(() => [...gaChannels.value].sort((a, b) => b.sessions - a.sessions).slice(0, 4))

// ── Email campaigns ──────────────────────────────────────────
const showComposer = ref(false)
const emailCampaigns = ref<EmailCampaign[]>([])
const loadingCampaigns = ref(false)
const expandedId = ref<string | null>(null)
const expandedRecipients = ref<EmailCampaignRecipient[]>([])
const loadingRecipients = ref(false)
const sending = ref<string | false>(false)
const deleting = ref<string | false>(false)
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)

function showToast(type: 'success' | 'error', message: string) {
  toast.value = { type, message }
  setTimeout(() => { toast.value = null }, 4000)
}

async function loadCampaigns() {
  loadingCampaigns.value = true
  try {
    const res = await $fetch<{ data: EmailCampaign[] }>('/api/email-campaigns')
    emailCampaigns.value = res.data
  }
  catch { /* non-critical */ }
  finally { loadingCampaigns.value = false }
}

async function toggleExpanded(id: string) {
  if (expandedId.value === id) {
    expandedId.value = null
    expandedRecipients.value = []
    return
  }
  expandedId.value = id
  expandedRecipients.value = []
  loadingRecipients.value = true
  try {
    const res = await $fetch<{ data: EmailCampaign & { recipients: EmailCampaignRecipient[] } }>(`/api/email-campaigns/${id}`)
    expandedRecipients.value = res.data.recipients
  }
  catch { /* non-critical */ }
  finally { loadingRecipients.value = false }
}

async function sendCampaign(campaign: EmailCampaign) {
  sending.value = campaign.id
  try {
    const res = await $fetch<{ data: { sent: number; failed: number; total: number } }>(
      `/api/email-campaigns/${campaign.id}/send`,
      { method: 'POST' },
    )
    showToast('success', `Sent to ${res.data.sent} of ${res.data.total} leads.`)
    await loadCampaigns()
    expandedId.value = campaign.id
    await toggleExpanded(campaign.id)
    await toggleExpanded(campaign.id)
  }
  catch (e: unknown) {
    showToast('error', e instanceof Error ? e.message : 'Send failed')
  }
  finally { sending.value = false }
}

async function deleteCampaign(id: string) {
  deleting.value = id
  try {
    await $fetch(`/api/email-campaigns/${id}`, { method: 'DELETE' })
    emailCampaigns.value = emailCampaigns.value.filter(c => c.id !== id)
    if (expandedId.value === id) expandedId.value = null
  }
  catch (e: unknown) {
    showToast('error', e instanceof Error ? e.message : 'Delete failed')
  }
  finally { deleting.value = false }
}

function onCampaignSaved(campaign: EmailCampaign) {
  emailCampaigns.value.unshift(campaign)
  showComposer.value = false
  showToast('success', `"${campaign.name}" saved as draft.`)
}

function onCampaignSent(campaign: EmailCampaign, result: { sent: number; failed: number; total: number }) {
  showComposer.value = false
  showToast('success', `"${campaign.name}" sent to ${result.sent} of ${result.total} leads.`)
  loadCampaigns()
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-slate-500/20 text-slate-400',
    sending: 'bg-amber-500/15 text-amber-400',
    sent: 'bg-emerald-500/15 text-emerald-400',
    failed: 'bg-red-500/15 text-red-400',
  }
  return map[status] ?? 'bg-slate-500/20 text-slate-400'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

watch(tab, (t) => { if (t === 'email') loadCampaigns() })

// ── Paid campaigns ────────────────────────────────────────────
const MOCK_KEYWORDS = [
  { keyword: 'grant writing course', campaign: 'Free Grant Writing Course', impressions: 4200, clicks: 310, ctr: 7.4, conversions: 22, cost: 580 },
  { keyword: 'how to write a grant', campaign: 'Free Grant Writing Course', impressions: 3100, clicks: 210, ctr: 6.8, conversions: 14, cost: 420 },
  { keyword: 'grant writing training', campaign: 'Grant Writing 101', impressions: 2400, clicks: 180, ctr: 7.5, conversions: 18, cost: 490 },
  { keyword: 'learn grant writing', campaign: 'Grant Writing 101', impressions: 1800, clicks: 130, ctr: 7.2, conversions: 11, cost: 310 },
  { keyword: 'grants management consultant', campaign: 'Grants Management Consulting', impressions: 890, clicks: 67, ctr: 7.5, conversions: 8, cost: 380 },
  { keyword: 'nonprofit grants consultant', campaign: 'Grants Management Consulting', impressions: 720, clicks: 52, ctr: 7.2, conversions: 6, cost: 295 },
  { keyword: 'behavioral health consulting', campaign: 'Behavioral Health Consulting', impressions: 1100, clicks: 78, ctr: 7.1, conversions: 5, cost: 420 },
  { keyword: 'substance abuse program consultant', campaign: 'Behavioral Health Consulting', impressions: 640, clicks: 41, ctr: 6.4, conversions: 3, cost: 260 },
]

function encodeUTM(name: string) {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

function roasSignal(roas: number) {
  if (roas >= 3) return 'Scale ↑'
  if (roas >= 1.5) return 'Hold'
  return 'Review ⚠'
}

function signalClass(roas: number) {
  if (roas >= 3) return 'bg-emerald-500/15 text-emerald-400'
  if (roas >= 1.5) return 'bg-amber-500/15 text-amber-400'
  return 'bg-red-500/15 text-red-400'
}

function platformIcon(key: string) {
  const map: Record<string, string> = { fb: '📘', ig: '📸', li: '💼' }
  return map[key] ?? '📱'
}
</script>
