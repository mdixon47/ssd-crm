import { z } from 'zod'
import { getAnthropicClient } from '~/server/utils/anthropic'
import { runSocialMediaAgent } from '~/agents/SocialMediaAgent'
import { SOCIAL_PLATFORMS } from '~/lib/mockData'

const schema = z.object({
  platform: z.enum(['fb', 'ig', 'li']),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message })
  }

  const platformKey = parsed.data.platform
  const platform = SOCIAL_PLATFORMS[platformKey]
  if (!platform) {
    throw createError({ statusCode: 404, message: `Unknown platform: ${platformKey}` })
  }

  const client = getAnthropicClient()
  const result = await runSocialMediaAgent(client, platformKey, platform)

  return { data: result }
})
