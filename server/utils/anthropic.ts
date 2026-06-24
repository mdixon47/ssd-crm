import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (_client) return _client

  const apiKey = useRuntimeConfig().anthropicApiKey || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to your .env file.\n'
      + 'Get your key at: https://console.anthropic.com',
    )
  }

  // Bound every agent call so a slow/overloaded upstream fails fast instead of
  // blowing past Netlify's 26s function limit and surfacing as an opaque 504.
  // maxRetries MUST be 0: on a 26s serverless wall there's only budget for one
  // attempt — the SDK retries on timeout, so any retry would run straight into
  // the wall and 504 instead of letting our graceful fallback fire. A transient
  // 429/529 therefore surfaces as a clean error the caller can retry.
  _client = new Anthropic({ apiKey, timeout: 23_000, maxRetries: 0 })
  return _client
}
