<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white">Sales Call Pricing Sheet</h1>
        <p class="text-slate-400 text-sm mt-1">Reference pricing for all packages — use during sales calls</p>
      </div>
      <button @click="editMode = !editMode" class="btn-secondary text-sm">
        {{ editMode ? 'Done Editing' : 'Edit Prices' }}
      </button>
    </div>

    <!-- Package Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-for="pkg in packages" :key="pkg.id"
        :class="pkg.featured ? 'border-cyan-500/50 ring-1 ring-cyan-500/30' : 'border-slate-700/50'"
        class="card border relative">
        <div v-if="pkg.featured" class="absolute -top-3 left-1/2 -translate-x-1/2">
          <span class="bg-cyan-500 text-black text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
        </div>

        <div class="text-center mb-4">
          <div class="text-3xl mb-2">{{ pkg.icon }}</div>
          <div v-if="!editMode">
            <h3 class="text-xl font-bold text-white">{{ pkg.name }}</h3>
            <div class="text-3xl font-bold text-cyan-400 mt-2">${{ pkg.price.toLocaleString() }}</div>
            <div class="text-slate-400 text-sm">{{ pkg.period }}</div>
          </div>
          <div v-else class="space-y-2">
            <input v-model="pkg.name" type="text" class="field-input text-center font-bold" />
            <div class="flex items-center gap-2">
              <span class="text-slate-400">$</span>
              <input v-model.number="pkg.price" type="number" min="0" class="field-input" />
            </div>
            <input v-model="pkg.period" type="text" class="field-input text-center text-sm" />
          </div>
        </div>

        <ul class="space-y-2 mb-6">
          <li v-for="(feature, i) in pkg.features" :key="i" class="flex items-start gap-2 text-sm">
            <span class="text-cyan-400 mt-0.5 shrink-0">✓</span>
            <span v-if="!editMode" class="text-slate-300">{{ feature }}</span>
            <input v-else v-model="pkg.features[i]" type="text" class="field-input flex-1 text-sm py-1" />
          </li>
          <li v-if="editMode">
            <button @click="pkg.features.push('')" class="text-cyan-400 text-sm hover:text-cyan-300">+ Add feature</button>
          </li>
        </ul>

        <div v-if="!editMode && pkg.note" class="text-slate-500 text-xs text-center italic border-t border-slate-700/50 pt-3">
          {{ pkg.note }}
        </div>
        <div v-if="editMode">
          <label class="field-label">Note (optional)</label>
          <input v-model="pkg.note" type="text" class="field-input text-sm" placeholder="e.g. Most popular for 7-figure brands" />
        </div>
      </div>
    </div>

    <!-- Add-ons -->
    <div class="card">
      <h2 class="text-lg font-semibold text-white mb-4">Add-Ons & Upsells</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="addon in addons" :key="addon.id" class="bg-[#0b1120] rounded-lg p-4 border border-slate-700/50">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <div v-if="!editMode">
                <div class="text-white font-medium">{{ addon.name }}</div>
                <div class="text-slate-400 text-sm mt-1">{{ addon.description }}</div>
              </div>
              <div v-else class="space-y-2">
                <input v-model="addon.name" type="text" class="field-input font-medium" placeholder="Add-on name" />
                <input v-model="addon.description" type="text" class="field-input text-sm" placeholder="Description" />
              </div>
            </div>
            <div class="shrink-0 text-right">
              <div v-if="!editMode" class="text-cyan-400 font-semibold">${{ addon.price.toLocaleString() }}</div>
              <input v-else v-model.number="addon.price" type="number" min="0" class="field-input w-24 text-right" />
            </div>
          </div>
        </div>
        <button v-if="editMode" @click="addAddon"
          class="bg-[#0b1120] rounded-lg p-4 border border-dashed border-slate-600 text-slate-400 hover:text-slate-300 hover:border-slate-500 transition-colors text-sm">
          + Add new add-on
        </button>
      </div>
    </div>

    <!-- Objection Handling -->
    <div class="card">
      <h2 class="text-lg font-semibold text-white mb-4">Objection Handling</h2>
      <div class="space-y-3">
        <div v-for="obj in objections" :key="obj.id" class="bg-[#0b1120] rounded-lg p-4 border border-slate-700/50">
          <div v-if="!editMode">
            <div class="text-yellow-400 text-sm font-medium mb-1">"{{ obj.objection }}"</div>
            <div class="text-slate-300 text-sm">{{ obj.response }}</div>
          </div>
          <div v-else class="space-y-2">
            <input v-model="obj.objection" type="text" class="field-input" placeholder="Objection…" />
            <textarea v-model="obj.response" class="field-input" rows="2" placeholder="Your response…"></textarea>
          </div>
        </div>
        <button v-if="editMode" @click="addObjection"
          class="text-cyan-400 text-sm hover:text-cyan-300">+ Add objection</button>
      </div>
    </div>

    <!-- Closing Script -->
    <div class="card">
      <h2 class="text-lg font-semibold text-white mb-3">Closing Script</h2>
      <div v-if="!editMode" class="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{{ closingScript }}</div>
      <textarea v-else v-model="closingScript" class="field-input w-full" rows="8"></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
const editMode = ref(false)

const packages = ref([
  {
    id: 1,
    icon: '🚀',
    name: 'Starter',
    price: 2500,
    period: 'one-time',
    featured: false,
    note: 'Best for early-stage DTC brands',
    features: [
      '90-min deep-dive strategy session',
      'Paid acquisition audit',
      'Custom campaign roadmap',
      '30-day email support',
    ],
  },
  {
    id: 2,
    icon: '⚡',
    name: 'Growth',
    price: 5000,
    period: 'per month',
    featured: true,
    note: 'Most popular for 7-figure brands',
    features: [
      'Full-funnel paid media management',
      'Meta + Google Ads',
      'Weekly performance reviews',
      'Landing page optimization',
      'Monthly strategy calls',
    ],
  },
  {
    id: 3,
    icon: '💎',
    name: 'Elite',
    price: 10000,
    period: 'per month',
    featured: false,
    note: 'White-glove for 8-figure brands',
    features: [
      'Everything in Growth',
      'Dedicated account team',
      'Creative strategy & production',
      'Attribution & analytics setup',
      'Unlimited strategy calls',
      'Priority support (24hr response)',
    ],
  },
])

const addons = ref([
  { id: 1, name: 'Creative Production', description: 'Static + video ad creative (10 assets/mo)', price: 1500 },
  { id: 2, name: 'Email Marketing', description: 'Klaviyo flows + campaigns setup', price: 1000 },
  { id: 3, name: 'Landing Page Build', description: 'High-converting LP (Figma → Webflow/Shopify)', price: 2500 },
  { id: 4, name: 'Analytics Dashboard', description: 'Custom Looker Studio / GA4 setup', price: 750 },
])

const objections = ref([
  {
    id: 1,
    objection: "It's too expensive.",
    response: "Totally understand. What I'd ask you to consider is the cost of *not* fixing your acquisition — every month you're leaving revenue on the table. Most clients 2–3x their ROAS in the first 90 days, which pays for this many times over.",
  },
  {
    id: 2,
    objection: "We already have an in-house team.",
    response: "Great — we actually love working alongside in-house teams. We bring a specialized external perspective and free your team to focus on brand and creative while we handle the paid channels.",
  },
  {
    id: 3,
    objection: "Can we start with a smaller engagement?",
    response: "Absolutely. Our Starter package is a great way to get a taste of what we do with no long-term commitment. Many of our best clients started there and upgraded within 60 days.",
  },
])

const closingScript = ref(`"Based on everything we've discussed, it sounds like [Growth / Elite] is the right fit for you.

Here's what happens next: I'll send over the agreement today — it's a simple 2-page doc. Once you sign and we receive the first payment, we kick off within 48 hours with an onboarding call and full account access.

Any questions before we move forward?"

[Pause — let them respond. Don't fill the silence.]

If yes: "Fantastic. I'll have the agreement in your inbox within the hour."
If hesitant: "What's the one thing holding you back right now?"`)

function addAddon() {
  addons.value.push({ id: Date.now(), name: '', description: '', price: 0 })
}

function addObjection() {
  objections.value.push({ id: Date.now(), objection: '', response: '' })
}
</script>
