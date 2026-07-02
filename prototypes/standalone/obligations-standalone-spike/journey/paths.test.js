import { describe, expect, it } from 'vitest'
import { BASE } from './config.js'
import {
  breadcrumbs,
  changePath,
  hubPath,
  pagePath,
  resolveNav,
  startPath
} from './paths.js'

describe('journey/paths — URL builders', () => {
  it('builds the shell URLs off BASE with no {id} segment', () => {
    expect(startPath()).toBe(`${BASE}/start`)
    expect(hubPath()).toBe(`${BASE}/hub`)
    expect(hubPath()).not.toMatch(/\{id\}/)
  })

  it('builds page URLs from Flow slugs, nested slugs included', () => {
    expect(pagePath('about-you')).toBe(`${BASE}/about-you`)
    expect(pagePath('claims/add')).toBe(`${BASE}/claims/add`)
    expect(pagePath('addons/protected-ncd/years')).toBe(
      `${BASE}/addons/protected-ncd/years`
    )
  })

  it('appends ?change=1 for a CYA Change round trip', () => {
    expect(changePath('driving-history')).toBe(
      `${BASE}/driving-history?change=1`
    )
  })
})

describe('journey/paths — resolveNav sentinel translation', () => {
  it('maps a slug to its page URL and the terminals to the bookends', () => {
    expect(resolveNav('cover-type')).toBe(pagePath('cover-type'))
    expect(resolveNav({ terminal: 'hub' })).toBe(hubPath())
    expect(resolveNav({ terminal: 'start' })).toBe(BASE)
  })

  it('throws loudly on unknown sentinels', () => {
    expect(() => resolveNav({ terminal: 'nowhere' })).toThrow(
      /navigation sentinel/
    )
    expect(() => resolveNav(undefined)).toThrow(/navigation sentinel/)
  })
})

describe('journey/paths — breadcrumbs', () => {
  it('keeps the hub reachable and ends on the unlinked page title', () => {
    const trail = breadcrumbs('About you')
    expect(trail.map((crumb) => crumb.text)).toEqual([
      'Prototypes',
      'Obligations (standalone)',
      'Your application',
      'About you'
    ])
    expect(trail.find((crumb) => crumb.text === 'Your application').href).toBe(
      hubPath()
    )
    expect(trail.at(-1).href).toBeUndefined()
  })
})
