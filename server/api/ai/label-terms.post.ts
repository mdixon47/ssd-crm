import { z } from 'zod'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { runSearchTermAgent } from '~/agents/SearchTermAgent'
import type { SearchTerm } from '~/types'

const SearchTermSchema = z.object({
  id: z.string(),
  term: z.string(),
  campaign: z.string().optional(),
  cost: z.number().optional(),
  clicks: z.number().optional(),
  conversions: z.number().optional(),
})

const schema = z.object({
  terms: z.array(SearchTermSchema).max(500).optional(),
  auto_apply: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  const raw = await readBody(event).catch(() => ({}))
  const parsed = schema.safeParse(raw ?? {})
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }
  const body = parsed.data
  const client = getAnthropicClient()
  const supabase = createSupabaseClient()

  // Accept terms from body or fetch unlabeled ones from DB
  let terms: SearchTerm[] = (body.terms ?? []) as SearchTerm[]

  if (terms.length === 0) {
    const { data } = await supabase
      .from('search_terms')
      .select('*')
      .eq('label', '')
      .limit(50)
    terms = data ?? []
  }

  if (terms.length === 0) {
    return { data: { labeled_terms: [], summary: {}, message: 'No unlabeled terms to process' } }
  }

  const result = await runSearchTermAgent(client, terms)

  // Apply suggested labels back to DB (still requires human to confirm via UI)
  if (body.auto_apply === true) {
    for (const labeled of result.labeled_terms) {
      if (labeled.confidence === 'high') {
        await supabase
          .from('search_terms')
          .update({ label: labeled.suggested_label })
          .eq('id', labeled.id)
      }
    }
  }

  return { data: result }
})
