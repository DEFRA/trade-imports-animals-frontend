import { describe, expect, test } from 'vitest'
import { getSafeRedirect } from './get-safe-redirect.js'

describe('getSafeRedirect', () => {
  test('returns "/" when redirect is undefined', () => {
    expect(getSafeRedirect(undefined)).toBe('/')
  })

  test('returns "/" when redirect is null', () => {
    expect(getSafeRedirect(null)).toBe('/')
  })

  test('returns "/" when redirect does not start with "/"', () => {
    expect(getSafeRedirect('http://example.com')).toBe('/')
    expect(getSafeRedirect('example.com/path')).toBe('/')
    expect(getSafeRedirect('')).toBe('/')
    expect(getSafeRedirect('foo/bar')).toBe('/')
  })

  test('returns redirect when redirect starts with "/"', () => {
    expect(getSafeRedirect('/auth/sign-in')).toBe('/auth/sign-in')
    expect(getSafeRedirect('/some/deep/path?x=1')).toBe('/some/deep/path?x=1')
  })
})
