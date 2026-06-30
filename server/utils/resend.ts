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

// Canonical sender for ALL outbound email. Every send (single message and
// campaigns) routes through getFromEmail(), so fixing the address here
// guarantees one consistent from address across the whole app — it cannot be
// overridden by an env var. Update this single constant if the sending
// identity ever changes.
// NOTE: ssd-consulting.com must be a verified sending domain in Resend
// (https://resend.com/domains) for delivery to succeed.
export const FROM_EMAIL = 'stephanie@ssd-consulting.com'

export function getFromEmail(): string {
  return FROM_EMAIL
}
