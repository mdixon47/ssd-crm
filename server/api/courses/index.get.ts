import { createSupabaseClient } from '~/server/utils/supabase'
import { summarizeRegistrations } from '~/server/utils/courseRegistration'

// Courses dashboard: courses with registration totals by campaign source,
// recent registrations, open onboarding tasks, and failures awaiting review.
export default defineEventHandler(async () => {
  const supabase = createSupabaseClient()

  const [courses, registrations, recent, tasks, failures] = await Promise.all([
    supabase.from('courses')
      .select('id, slug, title, summary, starts_on, format, price, is_active, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('course_registrations')
      .select('course_id, utm_source, created_at')
      .eq('status', 'registered')
      .limit(10000),
    supabase.from('course_registrations')
      .select('id, created_at, course_id, lead_id, fname, lname, email, org, utm_source, utm_campaign')
      .order('created_at', { ascending: false })
      .limit(25),
    supabase.from('tasks')
      .select('id, title, status, due_date, assignee, lead_id, registration_id, created_at')
      .eq('status', 'open')
      .order('due_date', { ascending: true })
      .limit(100),
    supabase.from('workflow_failures')
      .select('id, created_at, workflow, reference, payload, error')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const failed = [courses, registrations, recent, tasks, failures].find(r => r.error)
  if (failed?.error) throw createError({ statusCode: 500, message: failed.error.message })

  return {
    courses: courses.data ?? [],
    totals: summarizeRegistrations(registrations.data ?? []),
    recent: recent.data ?? [],
    tasks: tasks.data ?? [],
    failures: failures.data ?? [],
  }
})
