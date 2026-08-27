import { describe, expect, it } from 'vitest'

import { copyFor } from './copy.js'
import { copy as sharedEn } from './copy.en.js'
import { copy as sharedCy } from './copy.cy.js'

const leaves = (node, path = []) =>
  typeof node === 'object' && node !== null
    ? Object.entries(node).flatMap(([key, value]) =>
        leaves(value, [...path, key])
      )
    : [{ path: path.join('.'), value: node }]

describe('#copyFor', () => {
  it('Should resolve the requested locale', () => {
    const en = { title: 'Hello' }
    expect(copyFor({ en }, 'en')).toBe(en)
  })

  it('Should default to English when no locale is given', () => {
    const en = { title: 'Hello' }
    expect(copyFor({ en })).toBe(en)
  })

  it('Should fall back to English for an unknown locale', () => {
    const en = { title: 'Hello' }
    expect(copyFor({ en }, 'cy')).toBe(en)
  })
})

describe('phase-banner copy', () => {
  it('Should carry the Design release 1 banner wording', () => {
    expect(sharedEn.layout.phaseBanner).toEqual({
      tag: 'Alpha',
      bodyPrefix: 'This is a new service. Help us improve it and',
      feedbackLinkText: 'give your feedback by email'
    })
  })

  it('Should carry the same banner keys in Welsh', () => {
    expect(Object.keys(sharedCy.layout.phaseBanner)).toEqual(
      Object.keys(sharedEn.layout.phaseBanner)
    )
  })
})

describe('service-navigation copy', () => {
  it('Should carry the Design release 1 item labels', () => {
    expect(sharedEn.layout.serviceNavigation).toEqual({
      menuButton: 'Menu',
      dashboard: 'Dashboard',
      addressBook: 'Address book',
      manageAccount: 'Manage account',
      logOut: 'Log out'
    })
  })

  it('Should carry the same item keys in Welsh', () => {
    expect(Object.keys(sharedCy.layout.serviceNavigation)).toEqual(
      Object.keys(sharedEn.layout.serviceNavigation)
    )
  })
})

describe('shared copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(sharedEn)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })
})
