import { describe, it, expect } from 'vitest'
import {
  DIGEST_WEEKDAY,
  isDigestDay,
  digestWindowStart,
  datesBetween,
} from '../../supabase/functions/_shared/almonerDigestSchedule'

const now = new Date('2026-10-12T05:00:00Z') // Monday 6am UK

describe('weekly Almoner digest schedule', () => {
  it('sends on Mondays by default', () => {
    expect(DIGEST_WEEKDAY).toBe(1)
    expect(isDigestDay('2026-10-12')).toBe(true)
    expect(isDigestDay('2026-10-13')).toBe(false)
    expect(isDigestDay('2026-10-11')).toBe(false)
  })
  it('looks back 7 days when no previous email exists', () => {
    expect(digestWindowStart(null, now)).toBe('2026-10-05T05:00:00.000Z')
  })
  it('starts at the last successful send in a normal week', () => {
    expect(digestWindowStart('2026-10-05T05:00:03Z', now)).toBe('2026-10-05T05:00:03.000Z')
  })
  it('covers a failed week by reaching back to the last real send', () => {
    expect(digestWindowStart('2026-09-28T05:00:00Z', now)).toBe('2026-09-28T05:00:00.000Z')
  })
  it('caps the look-back at 35 days', () => {
    expect(digestWindowStart('2026-01-01T00:00:00Z', now)).toBe('2026-09-07T05:00:00.000Z')
  })
  it('lists dates inclusively', () => {
    expect(datesBetween('2026-10-12', '2026-10-14')).toEqual(['2026-10-12', '2026-10-13', '2026-10-14'])
  })
})
