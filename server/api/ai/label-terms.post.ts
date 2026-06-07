import { getAnthropicClient } from '~/server/utils/anthropic'
import { createSupabaseClient } from '~/server/utils/supabase'
import { runSearchTermAgent } from '~/agents/SearchTermAgent'
import type { SearchTerm } from '~/types'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getAnthropicClient()
  const supabase = createSupabaseClient()

  // Accept terms from body or fetch unlabeled ones from DB
  let terms: SearchTerm[] = body.terms

  if (!terms || terms.length === 0) {
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
