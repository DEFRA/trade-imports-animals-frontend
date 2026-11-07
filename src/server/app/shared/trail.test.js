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
  requestTrail,
  trailBackLink,
  withTrail
} from './trail.js'

const HREF = '/n/j-1/a'
const OVERVIEW_THEN_ORIGIN = 'overview,origin'
const UNRECOGNISED_TRAIL_MESSAGE = 'Trail not recognised, trail dropped'

describe('the trail of places the trader came from', () => {
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
          'import-reason'
        )
      ).toBe(`${HREF}?x=1&from=overview%2Corigin%2Cimport-reason`)
    })

    it('Should keep a page slug that holds a slash as one place', () => {
      expect(
        pushTrail(trailRequest('commodities/identification'), HREF, 'origin')
      ).toBe(`${HREF}?from=commodities%2Fidentification%2Corigin`)
    })

    it('Should lose the oldest place of a trail past the longest', () => {
      const longestTrail = [
        'overview',
        ...Array.from({ length: LONGEST_TRAIL - 1 }, () => 'origin')
      ]
      const pushedHref = pushTrail(
        trailRequestOf(longestTrail),
        '/x',
        'additional-details'
      )

      const pushed = requestTrail(
        trailRequestOf(
          new URL(pushedHref, 'http://t.test').searchParams
            .get('from')
            .split(',')
        )
      )

      expect(pushed).toHaveLength(LONGEST_TRAIL)
      expect(pushed.at(0)).toBe('origin')
      expect(pushed.at(-1)).toBe('additional-details')
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

    it('Should go to Overview for a trail of Overview', () => {
      expect(trailBackLink(trailRequest('overview'))).toBe(hubPath('j-1'))
    })

    it('Should go to the dashboard for a trail of the dashboard', () => {
      expect(trailBackLink(trailRequest('dashboard'))).toBe(dashboardPath())
    })

    it('Should go to the Import Notification Service question for a trail of its start', () => {
      expect(trailBackLink(trailRequest('ins'))).toContain(
        'notification-id=j-1'
      )
    })

    it('Should go to the given fallback when the request carries no trail, without logging', () => {
      const request = trailRequest()

      expect(trailBackLink(request, { fallback: '/fallback' })).toBe(
        '/fallback'
      )
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
    ])(
      'Should go to the fallback and log once for %s',
      (_description, trail) => {
        const request = trailRequest(trail, {
          route: { path: '/notifications/{journeyId}/origin' }
        })

        expect(trailBackLink(request, { fallback: '/fallback' })).toBe(
          '/fallback'
        )
        expectOneLogged(request.logger, {
          level: 'warn',
          fields: {
            journeyId: 'j-1',
            route: '/notifications/{journeyId}/origin',
            trail,
            fallback: '/fallback'
          },
          message: UNRECOGNISED_TRAIL_MESSAGE
        })
      }
    )

    it('Should go to the fallback for a trail given more than once', () => {
      expect(
        trailBackLink(trailRequest(['overview', 'origin']), {
          fallback: '/fallback'
        })
      ).toBe('/fallback')
    })
  })

  describe('#nextTarget', () => {
    const page = { id: 'origin', slug: 'origin' }
    const scope = {}

    it('Should carry no trail to Overview when Save and return to overview was pressed', () => {
      expect(
        nextTarget(
          trailRequest('overview', { payload: { exit: 'hub' } }),
          page,
          scope
        )
      ).toBe(hubPath('j-1'))
    })
  })

  describe('#nextTargetKeepingTrail', () => {
    const page = { id: 'origin', slug: 'origin' }
    const scope = {}

    it('Should carry no trail to Overview when Save and return to overview was pressed', () => {
      expect(
        nextTargetKeepingTrail(
          trailRequest('overview', { payload: { exit: 'hub' } }),
          page,
          scope
        )
      ).toBe(hubPath('j-1'))
    })
  })
})
