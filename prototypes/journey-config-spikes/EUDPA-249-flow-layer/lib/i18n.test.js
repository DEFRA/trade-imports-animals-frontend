/**
 * Unit tests for `t()` resolution behaviour. The bulk of i18n coverage
 * lives in `i18n-coverage.test.js` (every source-referenced key must
 * resolve in en.json); this file pins the resolver semantics.
 */

import { describe, it, expect } from 'vitest'
import { t, tOrNull, hasKey } from './i18n.js'

describe('t() — key resolution', () => {
  it('returns the resolved string for a known key', () => {
    expect(t('flow.section.origin-and-reason.title')).toBe(
      'Country of origin and reason'
    )
  })

  it('returns the raw dotted-path for a missing key (visible fallback)', () => {
    expect(t('this.key.does.not.exist')).toBe('this.key.does.not.exist')
  })

  it('passes null / undefined through unchanged', () => {
    expect(t(null)).toBe(null)
    expect(t(undefined)).toBe(undefined)
  })
})

describe('t() — parameter interpolation', () => {
  it('substitutes {name} placeholders with supplied params', () => {
    expect(t('errors.domain.stringMaxLength', { max: 58, actual: 60 })).toBe(
      'Enter no more than 58 characters (you entered 60)'
    )
  })

  it('leaves {name} visible for missing params (obvious bug signal)', () => {
    // Missing `actual` — the substitution stays as `{actual}` in the
    // output, so a review or the eye picks it up in the browser.
    expect(t('errors.domain.stringMaxLength', { max: 10 })).toBe(
      'Enter no more than 10 characters (you entered {actual})'
    )
  })

  it('interpolates numbers, strings, and 0 correctly', () => {
    expect(t('errors.domain.integerMin', { min: 0 })).toBe(
      'Enter a whole number of at least 0'
    )
    expect(t('errors.domain.integerMin', { min: '3' })).toBe(
      'Enter a whole number of at least 3'
    )
  })
})

describe('tOrNull — variant that returns null on miss', () => {
  it('returns the resolved string for a known key', () => {
    expect(tOrNull('flow.section.origin-and-reason.title')).toBe(
      'Country of origin and reason'
    )
  })

  it('returns null (not the raw dotted-path) for a missing key', () => {
    // The whole point of tOrNull vs t: callers with their own fallback
    // (labels?.[v] ?? v etc.) should see null on miss so `??` fires.
    expect(tOrNull('this.key.does.not.exist')).toBe(null)
  })

  it('returns null for null / undefined input', () => {
    expect(tOrNull(null)).toBe(null)
    expect(tOrNull(undefined)).toBe(null)
  })

  it('interpolates params when the key resolves', () => {
    expect(
      tOrNull('errors.domain.stringMaxLength', { max: 5, actual: 6 })
    ).toBe('Enter no more than 5 characters (you entered 6)')
  })
})

describe('hasKey', () => {
  it('is true for a known key', () => {
    expect(hasKey('flow.section.arrival.title')).toBe(true)
  })

  it('is false for a missing key', () => {
    expect(hasKey('this.key.does.not.exist')).toBe(false)
  })

  it('is false for a key pointing at a non-string (e.g. nested object)', () => {
    expect(hasKey('flow')).toBe(false)
    expect(hasKey('flow.section')).toBe(false)
  })
})
