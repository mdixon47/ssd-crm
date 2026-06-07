<template>
  <div class="p-6 max-w-7xl mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-primary">Social Media</h1>
        <p class="text-sm text-slate-500 mt-0.5">Facebook, Instagram & LinkedIn — campaigns, content, and tracking</p>
      </div>
    </div>

    <!-- Platform tabs -->
    <div class="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
      <button
        v-for="p in PLATFORMS"
        :key="p.key"
        :class="['flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors', activePlatform === p.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700']"
        @click="activePlatform = p.key"
      >
        <span>{{ p.icon }}</span>
        {{ p.name }}
      </button>
    </div>

    <div v-if="platform">
      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div class="text-xs font-semibold text-slate-400 uppercase mb-1">Total Spend</div>
          <div class="text-2xl font-bold text-primary">${{ totalSpend.toLocaleString() }}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div class="text-xs font-semibold text-slate-400 uppercase mb-1">Total Leads</div>
          <div class="text-2xl font-bold text-primary">{{ totalLeads }}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div class="text-xs font-semibold text-slate-400 uppercase mb-1">Total Revenue</div>
          <div class="text-2xl font-bold text-green-600">${{ totalRevenue.toLocaleString() }}</div>
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div class="text-xs font-semibold text-slate-400 uppercase mb-1">ROAS</div>
          <div
            class="text-2xl font-bold"
            :class="platformRoas >= 3 ? 'text-green-600' : platformRoas >= 1.5 ? 'text-amber-600' : 'text-red-600'"
          >
            {{ totalSpend > 0 ? platformRoas.toFixed(2) : '—' }}x
          </div>
        </div>
      </div>

      <!-- Campaigns -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div
          v-for="campaign in platform.campaigns"
          :key="campaign.id"
          class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div class="px-5 py-4 border-b border-slate-100 flex items-start justify-between">
            <div>
              <div class="font-bold text-slate-800">{{ campaign.name }}</div>
              <div class="text-xs text-slate-400 mt-0.5">{{ campaign.objective }} · {{ campaign.status }}</div>
            </div>
            <span
              class="text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0"
              :class="campaign.spend > 0 && campaign.revenue / campaign.spend >= 2 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'"
            >
              {{ campaign.spend > 0 && campaign.revenue / campaign.spend >= 2 ? 'Scale ↑' : 'Hold' }}
            </span>
          </div>
          <div class="grid grid-cols-4 divide-x divide-slate-100 text-center text-sm">
            <div class="px-3 py-3"><div class="text-xs text-slate-400 mb-0.5">Spend</div><div class="font-bold">${{ campaign.spend.toLocaleString() }}</div></div>
            <div class="px-3 py-3"><div class="text-xs text-slate-400 mb-0.5">Leads</div><div class="font-bold">{{ campaign.leads }}</div></div>
            <div class="px-3 py-3"><div class="text-xs text-slate-400 mb-0.5">Revenue</div><div class="font-bold text-green-600">${{ campaign.revenue.toLocaleString() }}</div></div>
            <div class="px-3 py-3">
              <div class="text-xs text-slate-400 mb-0.5">ROAS</div>
              <div class="font-bold" :class="campaign.spend > 0 && campaign.revenue / campaign.spend >= 2 ? 'text-green-600' : 'text-amber-600'">
                {{ campaign.spend > 0 ? (campaign.revenue / campaign.spend).toFixed(1) : '—' }}x
              </div>
            </div>
          </div>
          <div class="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <div class="text-xs font-semibold text-slate-400 uppercase mb-1">UTM</div>
            <code class="text-xs text-slate-600 break-all">{{ platform.utm.template.replace('{campaign}', campaign.name.toLowerCase().replace(/\s+/g, '_')) }}</code>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <!-- Audiences -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div class="text-xs font-semibold text-slate-400 uppercase mb-3">Target Audiences</div>
          <ul class="space-y-2">
            <li v-for="aud in platform.audiences" :key="aud" class="flex items-start gap-2 text-sm text-slate-700">
              <span class="text-primary mt-0.5 flex-shrink-0">→</span>
              {{ aud }}
            </li>
          </ul>
        </div>

        <!-- Ad Formats -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div class="text-xs font-semibold text-slate-400 uppercase mb-3">Ad Formats</div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="fmt in platform.adFormats"
              :key="fmt"
              class="text-xs bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-full"
            >{{ fmt }}</span>
          </div>
        </div>

        <!-- UTM Params -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div class="text-xs font-semibold text-slate-400 uppercase mb-3">UTM Parameters</div>
          <div class="space-y-2 font-mono text-xs text-slate-600">
            <div><span class="text-slate-400">source:</span> {{ platform.utm.source }}</div>
            <div><span class="text-slate-400">medium:</span> {{ platform.utm.medium }}</div>
            <div><span class="text-slate-400">campaign:</span> {{ platform.utm.campaign }}</div>
            <div><span class="text-slate-400">content:</span> {{ platform.utm.content }}</div>
          </div>
          <div class="mt-3 pt-3 border-t border-slate-100">
            <div class="text-xs font-semibold text-slate-400 uppercase mb-2">Full Template</div>
            <code class="text-xs text-slate-600 break-all leading-relaxed">{{ platform.utm.template }}</code>
          </div>
        </div>
      </div>

      <!-- Content / Post Tracker -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div class="font-semibold text-slate-800">Content Tracker</div>
          <button class="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-primary-light" @click="showAddPost = true">
            + Add Post
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Title / Hook</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Format</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Publish Date</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">Reach</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">Eng.</th>
                <th class="text-right px-4 py-3 text-xs font-semibold text-slate-500">Leads</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="!platform.posts?.length">
                <td colspan="7" class="px-4 py-6 text-center text-slate-400 text-sm">No posts tracked yet. Click + Add Post to start.</td>
              </tr>
              <tr
                v-for="post in platform.posts"
                :key="post.id"
                class="hover:bg-slate-50/50 transition-colors"
              >
                <td class="px-4 py-3 font-medium text-slate-800">{{ post.title }}</td>
                <td class="px-4 py-3">
                  <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{{ post.format }}</span>
                </td>
                <td class="px-4 py-3">
                  <span
                    class="text-xs px-2 py-0.5 rounded-full font-medium"
                    :class="post.status === 'published' ? 'bg-green-100 text-green-700' : post.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ post.status }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-500 text-xs">{{ post.publish_date }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ post.reach?.toLocaleString() ?? '—' }}</td>
                <td class="px-4 py-3 text-right text-slate-600">{{ post.engagement ?? '—' }}</td>
                <td class="px-4 py-3 text-right font-semibold" :class="(post.leads ?? 0) > 0 ? 'text-green-600' : 'text-slate-400'">{{ post.leads ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Post Modal -->
    <div v-if="showAddPost" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" @click.self="showAddPost = false">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h3 class="font-bold text-primary mb-4">Add Post / Content</h3>
        <div class="space-y-3">
          <div><label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Title / Hook *</label><input v-model="newPost.title" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50" ></div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Format</label>
              <select v-model="newPost.format" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option v-for="fmt in platform?.adFormats" :key="fmt">{{ fmt }}</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Status</label>
              <select v-model="newPost.status" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option>draft</option><option>scheduled</option><option>published</option>
              </select>
            </div>
          </div>
          <div><label class="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Publish Date</label><input v-model="newPost.publish_date" type="date" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" ></div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="px-4 py-2 border border-slate-200 rounded-lg text-sm" @click="showAddPost = false">Cancel</button>
          <button class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold" @click="addPost">Add Post</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SOCIAL_PLATFORMS } from '~/lib/mockData'
import type { SocialPlatformData } from '~/types'

const PLATFORMS = [
  { key: 'fb', name: 'Facebook', icon: '📘' },
  { key: 'ig', name: 'Instagram', icon: '📸' },
  { key: 'li', name: 'LinkedIn', icon: '💼' },
]

const activePlatform = ref('fb')
const showAddPost = ref(false)
const newPost = reactive({ title: '', format: '', status: 'draft' as const, publish_date: new Date().toISOString().slice(0, 10) })

const platform = computed<SocialPlatformData | undefined>(() => SOCIAL_PLATFORMS[activePlatform.value])
const totalSpend = computed(() => platform.value?.campaigns.reduce((s, c) => s + c.spend, 0) ?? 0)
const totalLeads = computed(() => platform.value?.campaigns.reduce((s, c) => s + c.leads, 0) ?? 0)
const totalRevenue = computed(() => platform.value?.campaigns.reduce((s, c) => s + c.revenue, 0) ?? 0)
const platformRoas = computed(() => totalSpend.value > 0 ? totalRevenue.value / totalSpend.value : 0)

function addPost() {
  if (!newPost.title.trim() || !platform.value) return
  if (!platform.value.posts) platform.value.posts = []
  platform.value.posts.push({ id: String(Date.now()), ...newPost, reach: 0, engagement: 0, leads: 0 })
  Object.assign(newPost, { title: '', format: '', status: 'draft', publish_date: new Date().toISOString().slice(0, 10) })
  showAddPost.value = false
}
</script>
