import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const leadId = query.lead_id as string | undefined
  const upcoming = query.upcoming === 'true'

  const supabase = createSupabaseClient()
  let q = supabase
    .from('appointments')
    .select('*, leads(fname, lname, org)')
    .order('scheduled_at', { ascending: true })

  if (leadId) q = q.eq('lead_id', leadId)
  if (upcoming) q = q.gte('scheduled_at', new Date().toISOString()).eq('status', 'scheduled')

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, message: error.message })

  type RowWithLeads = { leads?: { fname: string; lname: string; org?: string } | null } & Record<string, unknown>
  const rows = (data ?? []).map((r: RowWithLeads) => ({
    ...r,
    lead_name: r.leads ? `${r.leads.fname} ${r.leads.lname}`.trim() : null,
    lead_org: r.leads?.org ?? null,
    leads: undefined,
  }))

  return { data: rows }
})
