import { describe, expect, it } from 'vitest'

import { allRoutes } from '../../src/server/app/sets/live-animals/journeys/linear/features/index.js'
import {
  assertTargetsAreCurrent,
  auditPaths,
  auditUrls,
  FILLED_BY,
  QUERY,
  reportName,
  reportNames,
  SKIPPED
} from './audit-targets.js'

const journeyIds = {
  draft: 'GBN-AG-26-DRAFT1',
  submitted: 'GBN-AG-26-SUBMIT',
  transit: 'GBN-AG-26-TRANS1',
  temporaryAdmission: 'GBN-AG-26-TEMPA1'
}

const ORIGIN = 'http://localhost:3000'

const getPaths = allRoutes
  .filter(({ method }) => method === 'GET')
  .map(({ path }) => path)

describe('#auditPaths', () => {
  it('Should build a URL for every GET route the skip list does not name', () => {
    const paths = auditPaths(journeyIds)

    expect(paths).toHaveLength(getPaths.length - SKIPPED.size)
    expect(paths.some((path) => path.includes('{'))).toBe(false)
  })

  it('Should point each route at the notification that answers it and the rest at the draft', () => {
    const paths = auditPaths(journeyIds)

    expect(paths.filter((path) => path.includes(journeyIds.submitted))).toEqual(
      [`/notifications/${journeyIds.submitted}/confirmation`]
    )
    expect(paths.filter((path) => path.includes(journeyIds.transit))).toEqual([
      `/notifications/${journeyIds.transit}/destination-country`,
      `/notifications/${journeyIds.transit}/port-of-exit`,
      `/notifications/${journeyIds.transit}/transporters/private`
    ])
    expect(
      paths.filter((path) => path.includes(journeyIds.temporaryAdmission))
    ).toEqual([`/notifications/${journeyIds.temporaryAdmission}/exit-date`])
    expect(
      paths.filter((path) => path.includes(journeyIds.draft))
    ).toHaveLength(paths.length - FILLED_BY.size - 1)
  })

  it('Should carry the query string a route needs before it will render', () => {
    // No page needs one today, so register one for the length of this test
    // rather than let the mechanism go unproven.
    const path = '/notifications/{journeyId}/needs-a-query'
    const routes = [...allRoutes, { method: 'GET', path }]
    QUERY.set(path, '?for=placeOfOrigin')

    try {
      expect(auditPaths(journeyIds, routes)).toContain(
        `/notifications/${journeyIds.draft}/needs-a-query?for=placeOfOrigin`
      )
    } finally {
      QUERY.delete(path)
    }
  })

  it('Should audit a page the moment the app registers a GET route for it', () => {
    const routes = [
      ...allRoutes,
      { method: 'GET', path: '/notifications/{journeyId}/brand-new' }
    ]

    expect(auditPaths(journeyIds, routes)).toContain(
      `/notifications/${journeyIds.draft}/brand-new`
    )
  })

  it('Should refuse to audit a route whose notification shape was never seeded', () => {
    const unseeded = { ...journeyIds, transit: undefined }

    expect(() => auditPaths(unseeded)).toThrow(
      /audits .* on the "transit" notification, which the setup step did not seed/
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

  it('Should reject a filled-by entry naming a route the app no longer serves', () => {
    const [filledElsewhere] = FILLED_BY.keys()
    const routes = allRoutes.filter(({ path }) => path !== filledElsewhere)

    expect(() => assertTargetsAreCurrent(routes)).toThrow(
      /filled-by list names .*, which the app no longer serves/
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

describe('#reportName', () => {
  it('Should name a report after its route, without the seeded journey id', () => {
    expect(
      reportName(
        `${ORIGIN}/notifications/${journeyIds.draft}/commodities/identification`,
        journeyIds
      )
    ).toBe('notifications_commodities_identification')
  })

  it('Should name the report for the service start page', () => {
    expect(reportName(`${ORIGIN}/`, journeyIds)).toBe('home')
  })

  it('Should drop the query string a route needs to render', () => {
    expect(
      reportName(
        `${ORIGIN}/notifications/${journeyIds.draft}/consignors/select?page=2`,
        journeyIds
      )
    ).toBe('notifications_consignors_select')
  })
})

describe('#reportNames', () => {
  it('Should give a page the same report name however the notifications are seeded', () => {
    const other = Object.fromEntries(
      Object.keys(journeyIds).map((shape) => [shape, `GBN-AG-26-${shape}`])
    )

    expect(Object.values(reportNames(auditUrls(ORIGIN, other), other))).toEqual(
      Object.values(reportNames(auditUrls(ORIGIN, journeyIds), journeyIds))
    )
  })

  it('Should name every audited URL without leaking a journey id', () => {
    const urls = auditUrls(ORIGIN, journeyIds)
    const names = reportNames(urls, journeyIds)

    expect(Object.keys(names)).toEqual(urls)
    expect(Object.values(names).filter((name) => name.includes('GBN'))).toEqual(
      []
    )
  })

  it('Should refuse two routes that would overwrite each other', () => {
    const urls = [
      `${ORIGIN}/notifications/${journeyIds.draft}/origin`,
      `${ORIGIN}/notifications/${journeyIds.transit}/origin`
    ]

    expect(() => reportNames(urls, journeyIds)).toThrow(
      /would write both .* to notifications_origin\.report\.html/
    )
  })
})
