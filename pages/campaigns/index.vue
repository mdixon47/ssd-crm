<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-primary">Campaigns</h1>
      <div class="flex gap-2">
        <button
          class="text-sm px-3 py-1.5 border border-slate-200 rounded-lg hover:border-slate-300"
          @click="tab = tab === 'google' ? 'social' : 'google'"
        >
          {{ tab === 'google' ? '📱 Switch to Social' : '🔍 Switch to Google' }}
        </button>
      </div>
    </div>

    <!-- Tab selector -->
    <div class="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
      <button
        :class="['px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === 'google' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700']"
        @click="tab = 'google'"
      >
        🔍 Google Ads
      </button>
      <button
        :class="['px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === 'social' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700']"
        @click="tab = 'social'"
      >
        📱 Social Media
      </button>
    </div>

    <!-- Google Ads Campaigns -->
    <div v-if="tab === 'google'">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div
          v-for="campaign in GOOGLE_CAMPAIGNS"
          :key="campaign.id"
          class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div class="font-bold text-slate-800">{{ campaign.name }}</div>
              <div class="text-xs text-slate-400 mt-0.5">{{ campaign.status }} · Google Ads</div>
            </div>
            <span
              class="text-xs px-2.5 py-1 rounded-full font-semibold"
              :class="signalClass(campaign.revenue / campaign.spend)"
            >
              {{ roasSignal(campaign.revenue / campaign.spend) }}
            </span>
          </div>

          <div class="grid grid-cols-3 divide-x divide-slate-100 text-center">
            <div class="px-4 py-3">
              <div class="text-xs text-slate-400 mb-0.5">Spend</div>
              <div class="font-bold text-slate-800">${{ campaign.spend.toLocaleString() }}</div>
            </div>
            <div class="px-4 py-3">
              <div class="text-xs text-slate-400 mb-0.5">Leads</div>
              <div class="font-bold text-slate-800">{{ campaign.leads }}</div>
            </div>
            <div class="px-4 py-3">
              <div class="text-xs text-slate-400 mb-0.5">Revenue</div>
              <div class="font-bold text-green-600">${{ campaign.revenue.toLocaleString() }}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 text-center">
            <div class="px-4 py-2.5">
              <div class="text-xs text-slate-400 mb-0.5">CPL</div>
              <div class="font-semibold text-slate-700">${{ (campaign.spend / campaign.leads).toFixed(0) }}</div>
            </div>
            <div class="px-4 py-2.5">
              <div class="text-xs text-slate-400 mb-0.5">ROAS</div>
              <div
                class="font-bold"
                :class="campaign.revenue / campaign.spend >= 3 ? 'text-green-600' : campaign.revenue / campaign.spend >= 1.5 ? 'text-amber-600' : 'text-red-600'"
              >
                {{ (campaign.revenue / campaign.spend).toFixed(2) }}x
              </div>
            </div>
          </div>

          <!-- Keywords summary -->
          <div v-if="campaign.keywords?.length" class="px-5 py-3 border-t border-slate-100">
            <div class="text-xs font-semibold text-slate-400 uppercase mb-2">Top Keywords</div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="kw in campaign.keywords.slice(0, 6)"
                :key="kw"
                class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
              >{{ kw }}</span>
            </div>
          </div>

          <!-- UTM reference -->
          <div class="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <div class="text-xs font-semibold text-slate-400 uppercase mb-1.5">UTM Template</div>
            <code class="text-xs text-slate-600 break-all leading-relaxed">
              utm_source=google&utm_medium=cpc&utm_campaign={{ encodeUTM(campaign.name) }}&utm_term={keyword}
            </code>
          </div>
        </div>
      </div>

      <!-- Keyword Bids Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100">
          <div class="font-semibold text-slate-800">Keyword Performance Overview</div>
          <div class="text-xs text-slate-400 mt-0.5">From mock data — connect Google Ads API for live data</div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50">
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
            <tbody class="divide-y divide-slate-100">
              <tr v-for="kw in MOCK_KEYWORDS" :key="kw.keyword" class="hover:bg-slate-50/50 transition-colors">
                <td class="px-4 py-2.5 font-medium text-slate-800">{{ kw.keyword }}</td>
                <td class="px-4 py-2.5 text-slate-500 text-xs">{{ kw.campaign }}</td>
                <td class="px-4 py-2.5 text-right text-slate-600">{{ kw.impressions.toLocaleString() }}</td>
                <td class="px-4 py-2.5 text-right text-slate-600">{{ kw.clicks }}</td>
                <td class="px-4 py-2.5 text-right text-slate-500">{{ kw.ctr }}%</td>
                <td class="px-4 py-2.5 text-right font-semibold" :class="kw.conversions > 0 ? 'text-green-600' : 'text-slate-400'">{{ kw.conversions }}</td>
                <td class="px-4 py-2.5 text-right text-slate-600">${{ kw.cost }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Social Media Campaigns -->
    <div v-else>
      <div v-for="(platform, key) in SOCIAL_PLATFORMS" :key="key" class="mb-8">
        <div class="flex items-center gap-3 mb-4">
          <div class="text-2xl">{{ platformIcon(key) }}</div>
          <h2 class="text-lg font-bold text-slate-800">{{ platform.name }} Campaigns</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div
            v-for="campaign in platform.campaigns"
            :key="campaign.id"
            class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div class="px-5 py-4 border-b border-slate-100">
              <div class="font-bold text-slate-800">{{ campaign.name }}</div>
              <div class="text-xs text-slate-400 mt-0.5">{{ campaign.objective }} · {{ campaign.status }}</div>
            </div>
            <div class="grid grid-cols-4 divide-x divide-slate-100 text-center">
              <div class="px-3 py-2.5">
                <div class="text-xs text-slate-400 mb-0.5">Spend</div>
                <div class="font-bold text-sm">${{ campaign.spend }}</div>
              </div>
              <div class="px-3 py-2.5">
                <div class="text-xs text-slate-400 mb-0.5">Leads</div>
                <div class="font-bold text-sm">{{ campaign.leads }}</div>
              </div>
              <div class="px-3 py-2.5">
                <div class="text-xs text-slate-400 mb-0.5">Revenue</div>
                <div class="font-bold text-sm text-green-600">${{ campaign.revenue }}</div>
              </div>
              <div class="px-3 py-2.5">
                <div class="text-xs text-slate-400 mb-0.5">ROAS</div>
                <div class="font-bold text-sm" :class="campaign.revenue / campaign.spend >= 2 ? 'text-green-600' : 'text-amber-600'">
                  {{ campaign.spend > 0 ? (campaign.revenue / campaign.spend).toFixed(1) : '—' }}x
                </div>
              </div>
            </div>
            <div class="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <code class="text-xs text-slate-600 break-all">{{ platform.utm.template.replace('{campaign}', campaign.name.toLowerCase().replace(/\s+/g, '_')) }}</code>
            </div>
          </div>
        </div>

        <!-- Ad formats reference -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div class="text-xs font-semibold text-slate-400 uppercase mb-3">Ad Formats for {{ platform.name }}</div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="fmt in platform.adFormats"
              :key="fmt"
              class="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full"
            >{{ fmt }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GOOGLE_CAMPAIGNS, SOCIAL_PLATFORMS } from '~/lib/mockData'

const tab = ref<'google' | 'social'>('google')

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
  if (roas >= 3) return 'bg-green-100 text-green-700'
  if (roas >= 1.5) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function platformIcon(key: string) {
  const map: Record<string, string> = { fb: '📘', ig: '📸', li: '💼' }
  return map[key] ?? '📱'
}
</script>
