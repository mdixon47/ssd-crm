import { isPhantombusterConfigured, fetchPhantoms } from '~/server/utils/phantombuster'

// Lists the workspace's phantoms for the import panel. Auth is enforced by the
// global /api/** middleware; degrades to { configured: false } when no API key.
export default defineEventHandler(async () => {
  if (!isPhantombusterConfigured()) {
    return { configured: false, phantoms: [] }
  }
  try {
    const agents = await fetchPhantoms()
    return {
      configured: true,
      phantoms: agents.map(a => ({
        id: String(a.id),
        name: a.name,
        lastEndStatus: a.lastEndStatus ?? null,
        lastEndMessage: a.lastEndMessage ?? null,
      })),
    }
  }
  catch (e) {
    throw createError({
      statusCode: 502,
      message: e instanceof Error ? e.message : 'PhantomBuster request failed',
    })
  }
})
