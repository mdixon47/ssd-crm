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

  _client = new Anthropic({ apiKey })
  return _client
}
