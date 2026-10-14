// Unit coverage for the pure course-registration helpers: payload
// validation, campaign attribution mapping, and dashboard totals.
import { describe, it, expect } from 'vitest'
import {
  RegistrationSchema,
  inferLeadSource,
  toAttributionPayload,
  summarizeRegistrations,
} from '~/server/utils/courseRegistration'

describe('RegistrationSchema', () => {
  it('normalizes email and drops blank optionals', () => {
    const r = RegistrationSchema.parse({
      fname: ' Jane ', lname: 'Doe', email: ' Jane.Doe@Example.ORG ', phone: '  ', org: '',
    })
    expect(r.email).toBe('jane.doe@example.org')
    expect(r.fname).toBe('Jane')
    expect(r.phone).toBeUndefined()
    expect(r.org).toBeUndefined()
    expect(r.attribution).toEqual({})
  })

  it('rejects missing names and bad email', () => {
    expect(RegistrationSchema.safeParse({ fname: '', lname: 'D', email: 'a@b.co' }).success).toBe(false)
    expect(RegistrationSchema.safeParse({ fname: 'J', lname: 'D', email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects oversized fields', () => {
    const r = RegistrationSchema.safeParse({
      fname: 'J', lname: 'D', email: 'a@b.co', attribution: { utm_campaign: 'x'.repeat(161) },
    })
    expect(r.success).toBe(false)
  })
})

describe('inferLeadSource', () => {
  it('maps known utm_source aliases', () => {
    expect(inferLeadSource({ utm_source: 'FB' })).toBe('facebook')
    expect(inferLeadSource({ utm_source: 'Google' })).toBe('google')
    expect(inferLeadSource({ utm_source: 'linkedin' })).toBe('linkedin')
    expect(inferLeadSource({ utm_source: 'newsletter' })).toBe('email')
  })

  it('falls back to click IDs', () => {
    expect(inferLeadSource({ gclid: 'abc' })).toBe('google')
    expect(inferLeadSource({ fbclid: 'abc' })).toBe('facebook')
    expect(inferLeadSource({ li_fat_id: 'abc' })).toBe('linkedin')
  })

  it('treats no campaign data as organic, unknown sources as unset', () => {
    expect(inferLeadSource({})).toBe('organic')
    expect(inferLeadSource({ utm_source: 'podcast' })).toBeUndefined()
  })
})

describe('toAttributionPayload', () => {
  it('keeps raw UTMs and picks the first click ID', () => {
    const p = toAttributionPayload({
      utm_source: 'facebook', utm_campaign: 'gw101-fall', fbclid: 'fb1', landing: '/learn/gw101',
    })
    expect(p).toMatchObject({
      utm_source: 'facebook', utm_campaign: 'gw101-fall', click_id: 'fb1',
      landing: '/learn/gw101', lead_source: 'facebook',
    })
  })
})

describe('summarizeRegistrations', () => {
  const now = new Date('2026-10-14T12:00:00Z')

  it('totals per course with a source breakdown and 30-day window', () => {
    const totals = summarizeRegistrations([
      { course_id: 'c1', utm_source: 'facebook', created_at: '2026-10-10T00:00:00Z' },
      { course_id: 'c1', utm_source: 'Facebook', created_at: '2026-10-11T00:00:00Z' },
      { course_id: 'c1', utm_source: null, created_at: '2026-08-01T00:00:00Z' },
      { course_id: 'c2', utm_source: 'google', created_at: '2026-10-12T00:00:00Z' },
    ], now)

    const c1 = totals.find(t => t.course_id === 'c1')!
    expect(c1.total).toBe(3)
    expect(c1.last30Days).toBe(2)
    expect(c1.bySource).toEqual([
      { source: 'facebook', count: 2 },
      { source: 'direct / unknown', count: 1 },
    ])
    expect(totals.find(t => t.course_id === 'c2')!.total).toBe(1)
  })

  it('returns nothing for no rows', () => {
    expect(summarizeRegistrations([], now)).toEqual([])
  })
})
