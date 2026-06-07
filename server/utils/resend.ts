import { Resend } from 'resend'

let _client: Resend | null = null

export function getResendClient(): Resend {
  if (_client) return _client

  const apiKey = useRuntimeConfig().resendApiKey || process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not set. Add it to your .env file.\n'
      + 'Get your key at: https://resend.com/api-keys',
    )
  }

  _client = new Resend(apiKey)
  return _client
}

export function getFromEmail(): string {
  return useRuntimeConfig().resendFromEmail
    || process.env.RESEND_FROM_EMAIL
    || 'onboarding@resend.dev'
}
