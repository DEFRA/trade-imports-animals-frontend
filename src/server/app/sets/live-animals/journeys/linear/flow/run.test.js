import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../../../../../shared/paths.js'
import { dispatchPages } from '../features/index.js'
import {
  animalIdentificationPage,
  commoditiesPage,
  consignmentDetailsPage
} from '../features/commodities/page.js'
import { importReasonPage } from '../features/import-reason/page.js'
import { additionalDetailsPage } from '../features/additional-details/page.js'
import {
  portOfEntryPage,
  privateTransporterDetailsPage,
  transitCountriesPage,
  transportersPage,
  transportersSelectPage
} from '../features/transport/page.js'
import { documentsPage } from '../features/documents/page.js'
import { addressesPage } from '../features/addresses/page.js'
import { cphNumberPage } from '../features/cph-number/page.js'
import { consignmentContactSelectPage } from '../features/contact/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { declarationPage } from '../features/declaration/page.js'
import { dashboardPage } from '../features/dashboard/page.js'
import { makeScope } from '../../../../../engine/index.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { nextRunTarget, RUN_STEPS } from './run.js'
import { allFlowPages } from './flow.js'

const JOURNEY_ID = 'journey-1'
const next = (stepId, answers) =>
  nextRunTarget(stepId, makeScope(answers), JOURNEY_ID)

const lineSeed = {
  countryOfOrigin: 'FR',
  commodityLines: [{ commoditySelection: 'Cat', speciesSelection: '923501' }]
}

// A whole notification, so the tail of the run can be walked with every later
// question already answerable and the review page open.
const { values: completeSeed } = JSON.parse(
  readFileSync(new URL('./fixtures/happy-path.json', import.meta.url))
)

describe('#nextRunTarget — the opening run sequence', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
  })

  it('Should send origin to the commodity search page once the country is answered', () => {
    expect(next('origin', { countryOfOrigin: 'FR' })).toBe(
      pagePath(JOURNEY_ID, 'commodities')
    )
  })

  it('Should send the search page to the consignment details page once a line exists', () => {
    expect(next(commoditiesPage.id, lineSeed)).toBe(
      pagePath(JOURNEY_ID, 'consignment-details')
    )
  })

  it('Should skip the consignment details page while no line exists — with no line the whole tail is gated and the run collapses to the hub', () => {
    expect(next(commoditiesPage.id, { countryOfOrigin: 'FR' })).toBe(
      hubPath(JOURNEY_ID)
    )
  })

  it('Should send the consignment details page to import reason', () => {
    expect(next(consignmentDetailsPage.id, lineSeed)).toBe(
      pagePath(JOURNEY_ID, 'import-reason')
    )
  })

  it('Should send import reason straight to the identification surface — its follow-up questions are answered on the reason page itself', () => {
    for (const reasonForImport of ['internalMarket', 'transit']) {
      expect(next(importReasonPage.id, { ...lineSeed, reasonForImport })).toBe(
        pagePath(JOURNEY_ID, animalIdentificationPage.slug)
      )
    }
  })

  it('Should pass identification through to additional details with zero identifier records', () => {
    expect(next(animalIdentificationPage.id, lineSeed)).toBe(
      pagePath(JOURNEY_ID, 'additional-details')
    )
  })

  it('Should carry additional details on to the arrival details rather than ending on the hub', () => {
    expect(next(additionalDetailsPage.id, lineSeed)).toBe(
      pagePath(JOURNEY_ID, portOfEntryPage.slug)
    )
  })

  it('Should collapse to the hub when every later step is unreachable', () => {
    expect(
      next(importReasonPage.id, {
        countryOfOrigin: 'FR',
        reasonForImport: 'internalMarket'
      })
    ).toBe(hubPath(JOURNEY_ID))
  })

  it('Should return null for a page outside the run', () => {
    expect(next(dashboardPage.id, lineSeed)).toBeNull()
    expect(next(declarationPage.id, lineSeed)).toBeNull()
  })
})

describe('#nextRunTarget — the run past the arrival details', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
  })

  const step = (stepId) => next(stepId, completeSeed)

  it('Should send the arrival details to the transit countries when the consignment travels by road', () => {
    expect(step(portOfEntryPage.id)).toBe(
      pagePath(JOURNEY_ID, transitCountriesPage.slug)
    )
  })

  it.each(['AIRPLANE', 'VESSEL'])(
    'Should skip the transit countries when the consignment travels by %s',
    (meansOfTransport) => {
      expect(
        next(portOfEntryPage.id, { ...completeSeed, meansOfTransport })
      ).toBe(pagePath(JOURNEY_ID, transportersPage.slug))
    }
  )

  it('Should send the arrival details to the transit countries when the consignment travels by rail', () => {
    expect(
      next(portOfEntryPage.id, { ...completeSeed, meansOfTransport: 'RAILWAY' })
    ).toBe(pagePath(JOURNEY_ID, transitCountriesPage.slug))
  })

  it('Should send the transit countries on to the transporter question', () => {
    expect(step(transitCountriesPage.id)).toBe(
      pagePath(JOURNEY_ID, transportersPage.slug)
    )
  })

  it('Should take the transporter branch the answers reach and skip the other', () => {
    expect(step(transportersPage.id)).toBe(
      pagePath(JOURNEY_ID, transportersSelectPage.slug)
    )
    expect(step(transportersSelectPage.id)).toBe(
      pagePath(JOURNEY_ID, documentsPage.slug)
    )
    expect(
      next(transportersPage.id, { ...completeSeed, transporterType: 'Private' })
    ).toBe(pagePath(JOURNEY_ID, privateTransporterDetailsPage.slug))
    expect(
      next(privateTransporterDetailsPage.id, {
        ...completeSeed,
        transporterType: 'Private'
      })
    ).toBe(pagePath(JOURNEY_ID, documentsPage.slug))
  })

  it('Should send the documents on to the roles and addresses', () => {
    expect(step(documentsPage.id)).toBe(
      pagePath(JOURNEY_ID, addressesPage.slug)
    )
  })

  it('Should send the roles and addresses on to the CPH number and then the contact address', () => {
    expect(step(addressesPage.id)).toBe(
      pagePath(JOURNEY_ID, cphNumberPage.slug)
    )
    expect(step(cphNumberPage.id)).toBe(
      pagePath(JOURNEY_ID, consignmentContactSelectPage.slug)
    )
  })

  it('Should end the run on the review page once every task row is ready', () => {
    expect(step(consignmentContactSelectPage.id)).toBe(
      pagePath(JOURNEY_ID, notificationViewPage.slug)
    )
  })

  it('Should rest on the hub instead when the notification is not ready to review', () => {
    expect(next(consignmentContactSelectPage.id, lineSeed)).toBe(
      hubPath(JOURNEY_ID)
    )
  })

  it('Should rest on the hub after the review page — the run is over', () => {
    expect(step(notificationViewPage.id)).toBe(hubPath(JOURNEY_ID))
  })
})

describe('the run covers the journey', () => {
  // Pages deliberately outside the run: the dashboard sits before a
  // notification exists, and the declaration and confirmation close it after
  // the review page has ended the run.
  const OUTSIDE_THE_RUN = ['dashboard', 'declaration', 'confirmation']

  it('Should decide every flow page, either running it or listing it as outside the run', () => {
    const stepIds = RUN_STEPS.map((step) => step.id)
    const unregistered = allFlowPages
      .map((page) => page.id)
      .filter(
        (pageId) =>
          !stepIds.includes(pageId) && !OUTSIDE_THE_RUN.includes(pageId)
      )
    expect(
      unregistered,
      'a new journey page must be added to RUN_STEPS or listed as outside the run'
    ).toEqual([])
  })
})
