// ============================================================
// Search Term Labeling Agent
// Analyzes a batch of search terms and returns a recommended
// label for each: keep | watch | negative | build_page | new_campaign
//
// ⚠️  Output is a suggestion — human reviews before applying.
// ============================================================
import type Anthropic from '@anthropic-ai/sdk'
import type { SearchTerm, SearchTermLabel } from '~/types'

export interface LabeledTerm {
  id: string
  term: string
  suggested_label: SearchTermLabel
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface SearchTermOutput {
  labeled_terms: LabeledTerm[]
  summary: {
    keep: number
    watch: number
    negative: number
    build_page: number
    new_campaign: number
  }
  top_waste_terms: string[]
  top_opportunity_terms: string[]
  model_used: string
  tokens_used: number
}

const SYSTEM_PROMPT = `You are a Google Ads specialist for SSD Consulting. Your job is to label search terms from the search term report.

SSD Consulting SELLS:
✅ Grant writing courses (free intro + paid GW101)
✅ Grants Management Consulting (for organizations)
✅ Behavioral Health Consulting (for agencies and nonprofits)

SSD Consulting does NOT serve:
❌ Individuals seeking personal grant money
❌ People looking for grant writing jobs or employment
❌ People searching for clinical therapy, inpatient treatment, or psychiatrists
❌ People looking for free templates only (no training interest)

LABELING RULES:
- "keep": Clear buying/training intent from the right audience
- "watch": Ambiguous — could be a fit, needs more data
- "negative": Wrong audience (job seekers, individual grant hunters, clinical patients)
- "build_page": Legitimate search that deserves its own dedicated landing page
- "new_campaign": Reveals demand for a new offer or campaign not yet running`

export async function runSearchTermAgent(
  client: Anthropic,
  terms: SearchTerm[],
): Promise<SearchTermOutput> {
  let totalTokens = 0
  const modelUsed = 'claude-sonnet-4-6'

  // Process in batches of 20 to stay within context limits
  const batchSize = 20
  const allLabeled: LabeledTerm[] = []

  for (let i = 0; i < terms.length; i += batchSize) {
    const batch = terms.slice(i, i + batchSize)

    const termList = batch.map(t =>
      `ID: ${t.id} | Term: "${t.term}" | Campaign: ${t.campaign} | Spend: $${t.cost} | Clicks: ${t.clicks} | Conv: ${t.conversions}`,
    ).join('\n')

    const response = await client.messages.create({
      model: modelUsed,
      max_tokens: 2048,
      system: SYSTEM_PROMPT + '\n\nReturn ONLY valid JSON array. No markdown.',
      messages: [
        {
          role: 'user',
          content: `Label each of these search terms. Return a JSON array matching:
[{ "id": string, "term": string, "suggested_label": "keep"|"watch"|"negative"|"build_page"|"new_campaign", "confidence": "high"|"medium"|"low", "reason": string }]

Search terms to label:
${termList}`,
        },
      ],
    })

    totalTokens += (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0)

    try {
      const raw = response.content[0]?.type === 'text' ? response.content[0].text : '[]'
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const parsed: LabeledTerm[] = JSON.parse(cleaned)
      allLabeled.push(...parsed)
    }
    catch {
      // Fallback: mark all in batch as watch
      batch.forEach(t => allLabeled.push({
        id: t.id ?? t.term,
        term: t.term,
        suggested_label: 'watch',
        confidence: 'low',
        reason: 'Could not parse AI response — review manually',
      }))
    }
  }

  // Build summary
  const summary = { keep: 0, watch: 0, negative: 0, build_page: 0, new_campaign: 0 }
  allLabeled.forEach(t => {
    if (t.suggested_label in summary) summary[t.suggested_label as keyof typeof summary]++
  })

  const topWaste = allLabeled
    .filter(t => t.suggested_label === 'negative' && t.confidence === 'high')
    .map(t => t.term)
    .slice(0, 5)

  const topOpportunity = allLabeled
    .filter(t => ['build_page', 'new_campaign'].includes(t.suggested_label) && t.confidence === 'high')
    .map(t => t.term)
    .slice(0, 5)

  return {
    labeled_terms: allLabeled,
    summary,
    top_waste_terms: topWaste,
    top_opportunity_terms: topOpportunity,
    model_used: modelUsed,
    tokens_used: totalTokens,
  }
}
