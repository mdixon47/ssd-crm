import { fetchContainer } from '~/server/utils/phantombuster'

// Status of one phantom run — polled by the import panel until finished.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  if (!/^\d+$/.test(id)) {
    throw createError({ statusCode: 400, message: 'Invalid container id' })
  }
  try {
    const c = await fetchContainer(id)
    const finished = c.status ? c.status !== 'running' : Boolean(c.endDate)
    // exitCode is the outcome signal: a normal end is endType "finished"
    // whether the script succeeded (0) or errored (1). endType only
    // distinguishes abnormal ends (killed, launch error).
    const success = finished && (
      typeof c.exitCode === 'number' ? c.exitCode === 0 : c.endType === 'success'
    )
    return {
      id,
      status: c.status ?? null,
      finished,
      success,
      endType: c.endType ?? null,
      exitCode: c.exitCode ?? null,
    }
  }
  catch (e) {
    throw createError({
      statusCode: 502,
      message: e instanceof Error ? e.message : 'PhantomBuster request failed',
    })
  }
})
