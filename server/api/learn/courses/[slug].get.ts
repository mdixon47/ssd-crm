import { createSupabaseClient } from '~/server/utils/supabase'

// Public (no session): landing-page content for an active course.
// Exempted from the /api auth gate via the /api/learn prefix
// (server/middleware/auth.ts). Returns display fields only.
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug)) {
    throw createError({ statusCode: 404, message: 'Course not found' })
  }

  const supabase = createSupabaseClient()
  const { data, error } = await supabase
    .from('courses')
    .select('slug, title, summary, description, starts_on, format, price')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, message: 'Could not load course' })
  if (!data) throw createError({ statusCode: 404, message: 'Course not found' })

  return { data }
})
