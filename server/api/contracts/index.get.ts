import { createSupabaseClient } from '~/server/utils/supabase'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const leadId = query.lead_id as string | undefined
  const status = query.status as string | undefined

  const supabase = createSupabaseClient()
  let q = supabase
    .from('contracts')
    .select('*, leads(fname, lname, org)')
    .order('created_at', { ascending: false })

  if (leadId) q = q.eq('lead_id', leadId)
  if (status === 'signed') q = q.not('signed_at', 'is', null)
  if (status === 'paid') q = q.not('paid_at', 'is', null)
  if (status === 'pending') q = q.is('signed_at', null)

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
