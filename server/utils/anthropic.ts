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
  // A normal Sonnet tool call completes in ~8-15s, well under 20s. maxRetries is
  // kept low because, on a 26s serverless wall, there's only budget for one real
  // attempt (a transient 429/529 returns fast, so a single retry still fits).
  _client = new Anthropic({ apiKey, timeout: 20_000, maxRetries: 1 })
  return _client
}
