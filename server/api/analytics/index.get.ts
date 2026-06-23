// GET /api/analytics?range=LAST_30_DAYS
// Returns a normalized GA4 overview for the dashboard (live or mock).
import { getGA4Overview } from '~/server/utils/googleAnalytics'
import type { GADateRange } from '~/types'

const VALID_RANGES: GADateRange[] = ['LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS']

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const range = VALID_RANGES.includes(query.range as GADateRange)
    ? (query.range as GADateRange)
    : 'LAST_30_DAYS'

  try {
    const data = await getGA4Overview(range)
    return { data }
  }
  catch (e) {
    throw createError({
      statusCode: 502,
      message: `Google Analytics request failed: ${e instanceof Error ? e.message : 'unknown error'}`,
    })
  }
})
