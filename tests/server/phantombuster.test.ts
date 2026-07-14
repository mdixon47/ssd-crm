// Unit coverage for the pure PhantomBuster helpers: result-row → Lead mapping,
// profile-URL normalization (the dedupe key), and launch-argument merging.
import { describe, it, expect } from 'vitest'
import {
  mapPhantomRow,
  normalizeProfileUrl,
  mergePhantomArgument,
} from '~/server/utils/phantombuster'

const OPTS = { leadDate: '2026-07-14', phantomName: 'SSD CRM - LinkedIn Search Export' }

describe('mapPhantomRow', () => {
  it('maps a typical LinkedIn Search Export row', () => {
    const lead = mapPhantomRow({
      profileUrl: 'https://www.linkedin.com/in/jane-doe/',
      firstName: 'Jane',
      lastName: 'Doe',
      fullName: 'Jane Doe',
      jobTitle: 'Executive Director',
      companyName: 'Hope Nonprofit',
      location: 'Atlanta, GA',
      query: 'nonprofit executive director',
    }, OPTS)!

    expect(lead).toBeTruthy()
    expect(lead.fname).toBe('Jane')
    expect(lead.lname).toBe('Doe')
    expect(lead.org).toBe('Hope Nonprofit')
    expect(lead.title).toBe('Executive Director')
    expect(lead.keyword).toBe('nonprofit executive director')
    expect(lead.linkedin_url).toBe('https://www.linkedin.com/in/jane-doe/')
    expect(lead.source).toBe('linkedin')
    expect(lead.stage).toBe('New Lead')
    expect(lead.email).toBe('')
    expect(lead.lead_date).toBe('2026-07-14')
    expect(lead.notes).toContain('PhantomBuster')
    expect(lead.notes).toContain('Atlanta, GA')
  })

  it('splits fullName when first/last are missing and tolerates alias keys', () => {
    const lead = mapPhantomRow({
      url: 'https://linkedin.com/in/maria-garcia-lopez',
      name: 'Maria Garcia Lopez',
      occupation: 'Grants Manager',
      company: 'City Health',
      email: 'Maria@Example.ORG',
    }, OPTS)!

    expect(lead.fname).toBe('Maria')
    expect(lead.lname).toBe('Garcia Lopez')
    expect(lead.title).toBe('Grants Manager')
    expect(lead.org).toBe('City Health')
    expect(lead.email).toBe('maria@example.org')
  })

  it('keeps a profile-only row (URL but no name) importable', () => {
    const lead = mapPhantomRow({ profileUrl: 'https://linkedin.com/in/someone' }, OPTS)!
    expect(lead.fname).toBe('Unknown')
    expect(lead.linkedin_url).toBe('https://linkedin.com/in/someone')
  })

  it('rejects junk rows with neither name nor profile URL', () => {
    expect(mapPhantomRow({ error: 'Profile unavailable' }, OPTS)).toBeNull()
    expect(mapPhantomRow({}, OPTS)).toBeNull()
  })
})

describe('normalizeProfileUrl', () => {
  it('treats www/query/trailing-slash/case variants as the same profile', () => {
    const variants = [
      'https://www.linkedin.com/in/Jane-Doe/',
      'https://linkedin.com/in/jane-doe',
      'http://www.linkedin.com/in/jane-doe/?originalSubdomain=us',
      'https://linkedin.com/in/jane-doe//',
    ]
    const keys = new Set(variants.map(normalizeProfileUrl))
    expect(keys.size).toBe(1)
    expect(keys.has('linkedin.com/in/jane-doe')).toBe(true)
  })

  it('does not throw on non-URL garbage', () => {
    expect(normalizeProfileUrl('not a url ')).toBe('not a url')
  })
})

describe('mergePhantomArgument', () => {
  it('preserves saved identity config while overriding search fields', () => {
    const saved = JSON.stringify({
      searchType: 'keywords',
      keywords: 'old search',
      identityId: 'identity-123',
      connectionDegreesToScrape: ['2', '3+'],
    })
    const merged = mergePhantomArgument(saved, { keywords: 'new search', numberOfResultsPerLaunch: 25 })
    expect(merged.keywords).toBe('new search')
    expect(merged.numberOfResultsPerLaunch).toBe(25)
    expect(merged.identityId).toBe('identity-123')
    expect(merged.connectionDegreesToScrape).toEqual(['2', '3+'])
  })

  it('handles object, null, and corrupt-string saved arguments', () => {
    expect(mergePhantomArgument({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
    expect(mergePhantomArgument(null, { b: 2 })).toEqual({ b: 2 })
    expect(mergePhantomArgument('{not json', { b: 2 })).toEqual({ b: 2 })
  })
})
