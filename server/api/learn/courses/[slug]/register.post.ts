import { createSupabaseClient } from '~/server/utils/supabase'
import { RegistrationSchema, toAttributionPayload } from '~/server/utils/courseRegistration'

// Public (no session): register for an active course.
//
// register_for_course() (migration 013) matches or creates the CRM lead by
// email, records the registration with its campaign source, and creates one
// onboarding task — atomically and idempotently per (course, email). A repeat
// submission gets the same success response, so the endpoint doesn't reveal
// who is already registered.
//
// Anything that fails after validation is logged to workflow_failures so the
// team can follow up from the Courses page.
const SUCCESS = { ok: true, message: "You're registered. We'll be in touch with next steps." }

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug)) {
    throw createError({ statusCode: 404, message: 'Course not found' })
  }

  const parsed = RegistrationSchema.safeParse(await readBody(event).catch(() => null))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid registration',
      data: { issues: parsed.error.flatten().fieldErrors },
    })
  }
  const input = parsed.data

  // Honeypot filled → pretend success, write nothing.
  if (input.website) return SUCCESS

  const supabase = createSupabaseClient()
  const { error } = await supabase.rpc('register_for_course', {
    p_course_slug: slug,
    p_email: input.email,
    p_fname: input.fname,
    p_lname: input.lname,
    p_phone: input.phone ?? null,
    p_org: input.org ?? null,
    p_attribution: toAttributionPayload(input.attribution),
  })

  if (!error) return SUCCESS

  // P0002 = raised by register_for_course for a missing/inactive course.
  if (error.code === 'P0002') {
    throw createError({ statusCode: 404, message: 'Course not found' })
  }

  const { website: _honeypot, ...payload } = input
  const logged = await supabase.from('workflow_failures').insert({
    workflow: 'course_registration',
    reference: slug,
    payload,
    error: `${error.code ?? ''} ${error.message}`.trim(),
  })
  if (logged.error) {
    console.error('course registration failed and could not be logged:', error.message, logged.error.message)
  }

  throw createError({
    statusCode: 500,
    message: "We couldn't complete your registration. Our team has been notified and will follow up.",
  })
})
