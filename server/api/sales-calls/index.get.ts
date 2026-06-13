import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const leadId = query.lead_id as string | undefined

  const supabase = createSupabaseClient()
  let q = supabase
    .from('sales_calls')
    .select('*, leads(fname, lname, org)')
    .order('scheduled_at', { ascending: false })

  if (leadId) q = q.eq('lead_id', leadId)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, message: error.message })

  const rows = (data ?? []).map((r: any) => ({
    ...r,
    lead_name: r.leads ? `${r.leads.fname} ${r.leads.lname}`.trim() : null,
    lead_org: r.leads?.org ?? null,
    leads: undefined,
  }))

  return { data: rows }
})
