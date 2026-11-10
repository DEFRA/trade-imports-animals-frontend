import { describe, expect, it } from 'vitest'

import {
  expectOneLogged,
  journeyRequest,
  trailRequestOf
} from '../engine/test-support.js'
import { nextTarget, nextTargetKeepingTrail } from './kit.js'
import { dashboardPath, hubPath, pagePath } from './paths.js'
import {
  carryTrail,
  LONGEST_TRAIL,
  pushTrail,
  readReturnMarker,
  requestTrail,
  trailBackLink,
  withReturnMarker,
  withTrail
} from './trail.js'

const HREF = '/n/j-1/a'
const ORIGIN_ROUTE_PATH = '/notifications/{journeyId}/origin'
const REFUSED_RETURN = '//evil.example'
const OVERVIEW_THEN_ORIGIN = 'overview,origin'
const IMPORT_REASON_SLUG = 'import-reason'
const ADDITIONAL_DETAILS_SLUG = 'additional-details'
const CONSIGNMENT_DETAILS_SLUG = 'consignment-details'
const UNRECOGNISED_TRAIL_MESSAGE = 'Trail not recognised, trail dropped'

const placesOfTrailIn = (href) =>
  new URL(href, 'http://t.test').searchParams.get('from').split(',')

const trailOfLongestLength = () => {
  const cycle = ['origin', IMPORT_REASON_SLUG, CONSIGNMENT_DETAILS_SLUG]
  return [
    'overview',
    ...Array.from(
      { length: LONGEST_TRAIL - 1 },
      (_place, index) => cycle[index % cycle.length]
    )
  ]
}

const backLinksWalkedFrom = (places) => {
  const links = []
  let trail = places
  for (let step = 0; step <= LONGEST_TRAIL; step += 1) {
    const link = trailBackLink(trailRequestOf(trail))
    links.push(link)
    if (link === hubPath('j-1')) {
      return links
    }
    trail = link.includes('from=') ? placesOfTrailIn(link) : []
  }
  return links
}

const backLinksFromNewestToOldest = (places) => [
  ...places
    .map((place, index) =>
      withTrail(pagePath('j-1', place), places.slice(0, index))
    )
    .reverse(),
  hubPath('j-1')
]

const trailRequest = (trail, overrides = {}) =>
  journeyRequest('j-1', {
    query: trail === undefined ? {} : { from: trail },
    ...overrides
  })

describe('#pushTrail', () => {
  it('Should start the trail on an href without one', () => {
    expect(pushTrail(trailRequest(), HREF, 'origin')).toBe(
      `${HREF}?from=origin`
    )
  })

  it('Should add the place after the request’s trail and join an href’s own query', () => {
    expect(
      pushTrail(
        trailRequest(OVERVIEW_THEN_ORIGIN),
        `${HREF}?x=1`,
        IMPORT_REASON_SLUG
      )
    ).toBe(`${HREF}?x=1&from=overview%2Corigin%2Cimport-reason`)
  })

  it('Should keep a page slug that holds a slash as one place', () => {
    expect(
      pushTrail(trailRequest('commodities/identification'), HREF, 'origin')
    ).toBe(`${HREF}?from=commodities%2Fidentification%2Corigin`)
  })

  it('Should lose the oldest place of a trail past the longest', () => {
    const longestTrail = trailOfLongestLength()
    const pushedHref = pushTrail(
      trailRequestOf(longestTrail),
      '/x',
      ADDITIONAL_DETAILS_SLUG
    )

    const pushed = requestTrail(trailRequestOf(placesOfTrailIn(pushedHref)))

    expect(pushed).toHaveLength(LONGEST_TRAIL)
    expect(pushed.at(0)).toBe('origin')
    expect(pushed.at(-1)).toBe(ADDITIONAL_DETAILS_SLUG)
  })
})

describe('#carryTrail', () => {
  it('Should leave an href as it is when the request carries no trail', () => {
    expect(carryTrail(trailRequest(), HREF)).toBe(HREF)
  })

  it('Should carry exactly the request’s trail', () => {
    expect(carryTrail(trailRequest(OVERVIEW_THEN_ORIGIN), HREF)).toBe(
      `${HREF}?from=overview%2Corigin`
    )
  })

  it('Should drop a trail that names a place the journey does not have, and log it once', () => {
    const request = trailRequest('https://elsewhere.test')

    expect(carryTrail(request, HREF)).toBe(HREF)
    expect(carryTrail(request, HREF)).toBe(HREF)
    expectOneLogged(request.logger, {
      level: 'warn',
      fields: expect.objectContaining({
        journeyId: 'j-1',
        trail: 'https://elsewhere.test'
      }),
      message: UNRECOGNISED_TRAIL_MESSAGE
    })
  })
})

describe('#trailBackLink', () => {
  it('Should go to the page on top of the trail, carrying the places beneath it', () => {
    expect(trailBackLink(trailRequest(OVERVIEW_THEN_ORIGIN))).toBe(
      withTrail(pagePath('j-1', 'origin'), ['overview'])
    )
  })

  it('Should step back from a trail of the longest length to the place on top of it', () => {
    const trail = trailOfLongestLength()

    expect(trail).toHaveLength(LONGEST_TRAIL)
    expect(trailBackLink(trailRequestOf(trail))).toBe(
      withTrail(pagePath('j-1', trail.at(-1)), trail.slice(0, -1))
    )
  })

  it('Should step back through the newest places of a trail past the longest, then end at Overview', () => {
    const longestTrail = trailOfLongestLength()
    const newestPlaces = [...longestTrail.slice(1), ADDITIONAL_DETAILS_SLUG]

    expect(newestPlaces).toHaveLength(LONGEST_TRAIL)
    expect(
      backLinksWalkedFrom(
        placesOfTrailIn(
          pushTrail(trailRequestOf(longestTrail), '/x', ADDITIONAL_DETAILS_SLUG)
        )
      )
    ).toEqual(backLinksFromNewestToOldest(newestPlaces))
  })

  it('Should step back one place at a time, then end at Overview', () => {
    expect([
      trailBackLink(trailRequestOf(['overview', 'origin', IMPORT_REASON_SLUG])),
      trailBackLink(trailRequestOf(['overview', 'origin'])),
      trailBackLink(trailRequestOf(['overview']))
    ]).toEqual([
      withTrail(pagePath('j-1', IMPORT_REASON_SLUG), ['overview', 'origin']),
      withTrail(pagePath('j-1', 'origin'), ['overview']),
      hubPath('j-1')
    ])
  })

  it('Should go to Overview for an empty trail', () => {
    expect(trailBackLink(trailRequestOf([]))).toBe(hubPath('j-1'))
  })

  it('Should go to Overview for a trail of Overview', () => {
    expect(trailBackLink(trailRequest('overview'))).toBe(hubPath('j-1'))
  })

  it('Should go to the dashboard for a trail of the dashboard', () => {
    expect(trailBackLink(trailRequest('dashboard'))).toBe(dashboardPath())
  })

  it('Should go to the Import Notification Service question for a trail of its start', () => {
    expect(trailBackLink(trailRequest('ins'))).toContain('notification-id=j-1')
  })

  it('Should go to the given fallback when the request carries no trail, without logging', () => {
    const request = trailRequest()

    expect(trailBackLink(request, { fallback: '/fallback' })).toBe('/fallback')
    expect(request.logger.entries).toEqual([])
  })

  it('Should go to Overview when there is no trail and no fallback', () => {
    expect(trailBackLink(trailRequest())).toBe(hubPath('j-1'))
  })

  it.each([
    ['an unknown place', 'not-a-place'],
    ['an absolute URL', 'https://elsewhere.test/x'],
    ['an unknown place beneath a known one', 'not-a-place,origin'],
    ['an empty trail', '']
  ])('Should go to the fallback and log once for %s', (_description, trail) => {
    const request = trailRequest(trail, {
      route: { path: ORIGIN_ROUTE_PATH }
    })

    expect(trailBackLink(request, { fallback: '/fallback' })).toBe('/fallback')
    expectOneLogged(request.logger, {
      level: 'warn',
      fields: {
        journeyId: 'j-1',
        route: ORIGIN_ROUTE_PATH,
        trail,
        fallback: '/fallback'
      },
      message: UNRECOGNISED_TRAIL_MESSAGE
    })
  })

  it('Should go to the fallback for a trail given more than once', () => {
    expect(
      trailBackLink(trailRequest(['overview', 'origin']), {
        fallback: '/fallback'
      })
    ).toBe('/fallback')
  })
})

describe('#nextTarget and #nextTargetKeepingTrail', () => {
  it.each([
    ['nextTarget', nextTarget],
    ['nextTargetKeepingTrail', nextTargetKeepingTrail]
  ])(
    'Should carry no trail to Overview from %s when Save and return to overview was pressed',
    (_name, targetOf) => {
      expect(
        targetOf(
          trailRequest('overview', { payload: { exit: 'hub' } }),
          { id: 'origin', slug: 'origin' },
          {}
        )
      ).toBe(hubPath('j-1'))
    }
  )
})

describe('#withReturnMarker — the return marker on an href', () => {
  it('Should start the query string on an href without one', () => {
    expect(withReturnMarker('/a', 'addresses')).toBe('/a?return=addresses')
  })

  it('Should join to the query string an href already has', () => {
    expect(withReturnMarker('/a?x=1', 'addresses')).toBe(
      '/a?x=1&return=addresses'
    )
  })

  it('Should encode a slug that contains a slash', () => {
    expect(withReturnMarker('/a', 'commodities/identification')).toBe(
      '/a?return=commodities%2Fidentification'
    )
  })
})

describe('#readReturnMarker — the page a request says it came from', () => {
  const allowedSlugs = ['addresses', 'notification-view']
  const REFUSED_MARKER_MESSAGE = 'Return marker not recognised, marker dropped'
  const markerRequest = (query, overrides = {}) =>
    journeyRequest('j-1', {
      query,
      route: { path: ORIGIN_ROUTE_PATH },
      ...overrides
    })

  it('Should be empty and log nothing when the request carries no marker', () => {
    const request = markerRequest({})

    expect(readReturnMarker(request, allowedSlugs)).toEqual({})
    expect(request.logger.entries).toEqual([])
  })

  it('Should honour a marker naming an allowed slug and log nothing', () => {
    const request = markerRequest({ return: 'addresses' })

    expect(readReturnMarker(request, allowedSlugs)).toEqual({
      honouredSlug: 'addresses'
    })
    expect(request.logger.entries).toEqual([])
  })

  it('Should refuse a marker naming anything else and log it once at warn', () => {
    const request = markerRequest({ return: REFUSED_RETURN })

    expect(readReturnMarker(request, allowedSlugs)).toEqual({})
    expect(readReturnMarker(request, allowedSlugs)).toEqual({})
    expectOneLogged(request.logger, {
      level: 'warn',
      fields: {
        journeyId: 'j-1',
        route: ORIGIN_ROUTE_PATH,
        received: REFUSED_RETURN
      },
      message: REFUSED_MARKER_MESSAGE
    })
  })

  it('Should log a refused marker once on a request that carries no app', () => {
    const request = markerRequest({ return: REFUSED_RETURN }, { app: null })

    readReturnMarker(request, allowedSlugs)
    readReturnMarker(request, allowedSlugs)

    expect(request.logger.entries).toHaveLength(1)
  })

  it('Should log a refused marker cut to 200 characters', () => {
    const request = markerRequest({ return: 'x'.repeat(300) })

    readReturnMarker(request, allowedSlugs)

    expect(request.logger.entries[0].fields.received).toBe('x'.repeat(200))
  })

  it('Should log an unrecognised trail and a refused marker on one request once each', () => {
    const request = markerRequest({
      from: 'not-a-place',
      return: REFUSED_RETURN
    })

    requestTrail(request)
    readReturnMarker(request, allowedSlugs)

    expect(request.logger.entries.map(({ message }) => message)).toEqual([
      UNRECOGNISED_TRAIL_MESSAGE,
      REFUSED_MARKER_MESSAGE
    ])
  })
})
