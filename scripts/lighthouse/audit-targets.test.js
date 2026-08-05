import { describe, expect, it } from 'vitest'

import { allRoutes } from '../../src/server/app/sets/live-animals/journeys/linear/features/index.js'
import {
  assertTargetsAreCurrent,
  auditPaths,
  QUERY,
  SKIPPED,
  SUBMITTED_ONLY
} from './audit-targets.js'

const journeyIds = {
  draftJourneyId: 'GBN-AG-26-DRAFT1',
  submittedJourneyId: 'GBN-AG-26-SUBMIT'
}

const getPaths = allRoutes
  .filter(({ method }) => method === 'GET')
  .map(({ path }) => path)

describe('#auditPaths', () => {
  it('Should build a URL for every GET route the skip list does not name', () => {
    const paths = auditPaths(journeyIds)

    expect(paths).toHaveLength(getPaths.length - SKIPPED.size)
    expect(paths.some((path) => path.includes('{'))).toBe(false)
  })

  it('Should point the submitted-only routes at the submitted notification and the rest at the draft', () => {
    const paths = auditPaths(journeyIds)

    expect(
      paths.filter((path) => path.includes(journeyIds.submittedJourneyId))
    ).toEqual([`/notifications/${journeyIds.submittedJourneyId}/confirmation`])
    expect(
      paths.filter((path) => path.includes(journeyIds.draftJourneyId))
    ).toHaveLength(paths.length - 2)
  })

  it('Should carry the query string a route needs before it will render', () => {
    expect(auditPaths(journeyIds)).toContain(
      `/notifications/${journeyIds.draftJourneyId}/addresses/create${QUERY.get(
        '/notifications/{journeyId}/addresses/create'
      )}`
    )
  })

  it('Should audit a page the moment the app registers a GET route for it', () => {
    const routes = [
      ...allRoutes,
      { method: 'GET', path: '/notifications/{journeyId}/brand-new' }
    ]

    expect(auditPaths(journeyIds, routes)).toContain(
      `/notifications/${journeyIds.draftJourneyId}/brand-new`
    )
  })
})

describe('#assertTargetsAreCurrent', () => {
  it('Should pass against the routes the app registers today', () => {
    expect(() => assertTargetsAreCurrent()).not.toThrow()
  })

  it('Should reject a skip list naming a route the app no longer serves', () => {
    const [skipped] = SKIPPED.keys()
    const routes = allRoutes.filter(({ path }) => path !== skipped)

    expect(() => assertTargetsAreCurrent(routes)).toThrow(
      /skip list names .*, which the app no longer serves/
    )
  })

  it('Should reject a submitted-only entry naming a route the app no longer serves', () => {
    const [submittedOnly] = SUBMITTED_ONLY
    const routes = allRoutes.filter(({ path }) => path !== submittedOnly)

    expect(() => assertTargetsAreCurrent(routes)).toThrow(
      /submitted-only list names .*, which the app no longer serves/
    )
  })

  it('Should refuse a new route whose extra path parameter nothing can satisfy', () => {
    const routes = [
      ...allRoutes,
      { method: 'GET', path: '/notifications/{journeyId}/things/{thingId}' }
    ]

    expect(() => assertTargetsAreCurrent(routes)).toThrow(
      /cannot build a URL for \/notifications\/\{journeyId}\/things\/\{thingId}/
    )
  })
})
