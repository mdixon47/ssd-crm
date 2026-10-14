<template>
  <div class="min-h-screen px-4 py-10 sm:py-16" style="background:#060c18">
    <div class="max-w-3xl mx-auto">
      <div v-if="pending" class="text-slate-500 text-sm">Loading…</div>

      <div v-else-if="!course" class="card text-center py-16">
        <h1 class="text-xl font-semibold text-white">Course not available</h1>
        <p class="text-slate-400 text-sm mt-2">This course isn't open for registration right now.</p>
      </div>

      <template v-else>
        <header class="mb-8">
          <p class="text-xs font-semibold uppercase tracking-wide text-cyan-400">SSD Consulting</p>
          <h1 class="text-3xl sm:text-4xl font-bold text-white mt-2">{{ course.title }}</h1>
          <p v-if="course.summary" class="text-slate-300 text-lg mt-3">{{ course.summary }}</p>
          <div class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400 mt-4">
            <span v-if="course.starts_on">Starts {{ formatDate(course.starts_on) }}</span>
            <span v-if="course.format">{{ course.format }}</span>
            <span v-if="course.price != null">{{ course.price > 0 ? formatCurrency(course.price) : 'Free' }}</span>
          </div>
        </header>

        <div class="grid gap-6 md:grid-cols-5">
          <section v-if="course.description" class="md:col-span-3 card">
            <p class="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{{ course.description }}</p>
          </section>

          <section class="card" :class="course.description ? 'md:col-span-2' : 'md:col-span-5'">
            <div v-if="done" role="status" class="py-6">
              <h2 class="text-lg font-semibold text-white">Thank you!</h2>
              <p class="text-slate-300 text-sm mt-2">{{ done }}</p>
            </div>

            <form v-else class="space-y-4" novalidate @submit.prevent="submit">
              <h2 class="text-lg font-semibold text-white">Register</h2>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="field-label" for="fname">First name</label>
                  <input id="fname" v-model="form.fname" class="field-input" autocomplete="given-name" required maxlength="80">
                </div>
                <div>
                  <label class="field-label" for="lname">Last name</label>
                  <input id="lname" v-model="form.lname" class="field-input" autocomplete="family-name" required maxlength="80">
                </div>
              </div>
              <div>
                <label class="field-label" for="email">Email</label>
                <input id="email" v-model="form.email" type="email" class="field-input" autocomplete="email" required maxlength="254">
              </div>
              <div>
                <label class="field-label" for="phone">Phone (optional)</label>
                <input id="phone" v-model="form.phone" type="tel" class="field-input" autocomplete="tel" maxlength="40">
              </div>
              <div>
                <label class="field-label" for="org">Organization (optional)</label>
                <input id="org" v-model="form.org" class="field-input" autocomplete="organization" maxlength="160">
              </div>
              <!-- Honeypot: hidden from people and assistive tech -->
              <div aria-hidden="true" style="position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden">
                <label for="website">Website</label>
                <input id="website" v-model="form.website" tabindex="-1" autocomplete="off">
              </div>

              <p v-if="error" role="alert" class="text-sm text-red-400">{{ error }}</p>

              <button type="submit" class="btn-primary w-full" :disabled="submitting">
                {{ submitting ? 'Registering…' : 'Register' }}
              </button>
              <p class="text-xs text-slate-500">We'll only use your details to contact you about this course.</p>
            </form>
          </section>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

interface PublicCourse {
  slug: string
  title: string
  summary?: string | null
  description?: string | null
  starts_on?: string | null
  format?: string | null
  price?: number | null
}

const route = useRoute()
const slug = String(route.params.slug)

const { data, pending } = await useFetch<{ data: PublicCourse }>(`/api/learn/courses/${slug}`)
const course = computed(() => data.value?.data ?? null)

useHead(() => ({ title: course.value ? `${course.value.title} — SSD Consulting` : 'Course — SSD Consulting' }))

const form = reactive({ fname: '', lname: '', email: '', phone: '', org: '', website: '' })
const submitting = ref(false)
const error = ref('')
const done = ref('')

// Campaign source, captured from the landing URL on arrival.
const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'li_fat_id'] as const
function attribution() {
  const out: Record<string, string> = {}
  for (const key of ATTRIBUTION_KEYS) {
    const v = route.query[key]
    if (typeof v === 'string' && v) out[key] = v.slice(0, 500)
  }
  out.landing = route.fullPath.slice(0, 500)
  if (import.meta.client && document.referrer) out.referrer = document.referrer.slice(0, 500)
  return out
}

async function submit() {
  error.value = ''
  // Quick client-side check only; the server validates the email properly.
  const email = form.email.trim()
  if (!form.fname.trim() || !form.lname.trim() || !email.includes('@') || /\s/.test(email)) {
    error.value = 'Please enter your first name, last name, and a valid email.'
    return
  }
  submitting.value = true
  try {
    const res = await $fetch<{ message: string }>(`/api/learn/courses/${slug}/register`, {
      method: 'POST',
      body: { ...form, attribution: attribution() },
    })
    done.value = res.message
  }
  catch (e) {
    const err = e as { data?: { message?: string }, statusCode?: number }
    error.value = err.statusCode === 400
      ? 'Please check your details and try again.'
      : err.data?.message || 'Something went wrong. Please try again.'
  }
  finally {
    submitting.value = false
  }
}

function formatDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
</script>
