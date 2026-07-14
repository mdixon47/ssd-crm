import { z } from 'zod'
import { requireUser } from '~/server/utils/requireUser'
import { fetchPhantom, launchPhantom, mergePhantomArgument } from '~/server/utils/phantombuster'

const LaunchSchema = z.object({
  agentId: z.string().trim().regex(/^\d+$/, 'agentId must be a numeric PhantomBuster id'),
  // Optional per-run overrides for LinkedIn Search Export style phantoms.
  keywords: z.string().trim().min(2).max(200).optional(),
  searchUrl: z.string().trim().url().max(1000).optional(),
  numberOfResults: z.number().int().min(1).max(100).optional(),
})

// Launches a phantom and returns the run's containerId for client-side status
// polling (scrapes run minutes-long — far past the Netlify 26s wall, so the
// browser polls /api/phantombuster/containers/:id instead of us waiting here).
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const parsed = LaunchSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid launch payload',
      data: { issues: parsed.error.flatten() },
    })
  }
  const { agentId, keywords, searchUrl, numberOfResults } = parsed.data

  try {
    const overrides: Record<string, unknown> = {}
    if (searchUrl) {
      overrides.searchType = 'linkedInSearchUrl'
      overrides.linkedInSearchUrl = searchUrl
    }
    else if (keywords) {
      overrides.searchType = 'keywords'
      overrides.keywords = keywords
    }
    if (numberOfResults) {
      overrides.numberOfResultsPerLaunch = numberOfResults
      overrides.numberOfResultsPerSearch = numberOfResults
    }

    let containerId: string
    if (Object.keys(overrides).length > 0) {
      // A launch-time argument REPLACES the saved one, so merge with the saved
      // argument to keep the phantom's identity/session configuration intact.
      const agent = await fetchPhantom(agentId)
      containerId = await launchPhantom(agentId, mergePhantomArgument(agent.argument, overrides))
    }
    else {
      containerId = await launchPhantom(agentId)
    }
    return { containerId }
  }
  catch (e) {
    throw createError({
      statusCode: 502,
      message: e instanceof Error ? e.message : 'PhantomBuster launch failed',
    })
  }
})
