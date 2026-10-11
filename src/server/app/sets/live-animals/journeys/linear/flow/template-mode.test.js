import { describe, expect, it } from 'vitest'

import { templateModeRoutes } from '../../../../../shared/template-mode.js'
import { allRoutes } from '../features/index.js'
import {
  TEMPLATE_MODE_EXCLUDED_PAGE_IDS,
  TEMPLATE_MODE_EXCLUDED_SLUGS
} from './template-mode.js'

const twins = templateModeRoutes(allRoutes, {
  excludedSlugs: TEMPLATE_MODE_EXCLUDED_SLUGS
})

const twinFor = (method, slug) =>
  twins.find(
    (twin) =>
      twin.method === method && twin.path === `/templates/{journeyId}/${slug}`
  )

describe('template mode over the live animals journey', () => {
  it.each([
    'origin',
    'commodities',
    'commodities/identification',
    'transporters'
  ])('Should walk %s in template mode, for both reading and saving', (slug) => {
    expect(twinFor('GET', slug), `GET ${slug}`).toBeDefined()
    expect(twinFor('POST', slug), `POST ${slug}`).toBeDefined()
  })

  it.each([
    'accompanying-documents',
    'accompanying-documents/status',
    'notification-view',
    'declaration',
    'confirmation',
    'amend',
    'cancel-amend',
    'copy',
    'delete'
  ])('Should offer no %s in template mode', (slug) => {
    const paths = twins.map((twin) => twin.path)

    expect(paths).not.toContain(`/templates/{journeyId}/${slug}`)
  })

  it('Should leave out the pages the opening run skips in template mode', () => {
    expect(TEMPLATE_MODE_EXCLUDED_PAGE_IDS).toEqual(
      expect.arrayContaining([
        'accompanying-documents',
        'notification-view',
        'declaration',
        'confirmation'
      ])
    )
  })

  it('Should make every twin a wrapper of a journey route, never a copy of a page', () => {
    for (const twin of twins) {
      const original = allRoutes.find(
        (candidate) =>
          candidate.method === twin.method &&
          candidate.path === twin.path.replace('/templates/', '/notifications/')
      )
      expect(original, twin.path).toBeDefined()
      expect(twin.handler).not.toBe(original.handler)
      expect(twin.options).toEqual(original.options)
    }
  })

  it('Should give the overview a template twin', () => {
    expect(
      twins.find(
        (twin) =>
          twin.method === 'GET' && twin.path === '/templates/{journeyId}'
      )
    ).toBeDefined()
  })

  it('Should twin every journey route except the excluded ones', () => {
    const journeyRoutes = allRoutes.filter(
      (route) =>
        route.path === '/notifications/{journeyId}' ||
        (route.path.startsWith('/notifications/{journeyId}/') &&
          !TEMPLATE_MODE_EXCLUDED_SLUGS.some((excluded) => {
            const slug = route.path.slice('/notifications/{journeyId}/'.length)
            return slug === excluded || slug.startsWith(`${excluded}/`)
          }))
    )

    expect(twins).toHaveLength(journeyRoutes.length)
  })
})
