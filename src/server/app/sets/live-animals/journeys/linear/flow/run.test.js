import { SET_ID } from '../../../set.js'
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
  transporterAddPage,
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
import { nextRunTarget, RUN_STEPS, runBackTarget } from './run.js'
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
    buildDispatch(SET_ID, dispatchPages)
  })

  it('Should send origin to the commodity search page once the country is answered', () => {
    expect(next('origin', { countryOfOrigin: 'FR' })).toBe(
      pagePath(JOURNEY_ID, 'commodities')
    )
  })

  it('Should send the search page to import reason once a line exists', () => {
    expect(next(commoditiesPage.id, lineSeed)).toBe(
      pagePath(JOURNEY_ID, 'import-reason')
    )
  })

  it('Should skip the consignment details page while no line exists — with no line the whole tail is gated and the run collapses to the hub', () => {
    expect(next(commoditiesPage.id, { countryOfOrigin: 'FR' })).toBe(
      hubPath(JOURNEY_ID)
    )
  })

  it('Should send the consignment details page to the identification surface', () => {
    expect(next(consignmentDetailsPage.id, lineSeed)).toBe(
      pagePath(JOURNEY_ID, animalIdentificationPage.slug)
    )
  })

  it('Should send import reason on to the consignment details, whichever reason is given', () => {
    for (const reasonForImport of ['internalMarket', 'transit']) {
      expect(next(importReasonPage.id, { ...lineSeed, reasonForImport })).toBe(
        pagePath(JOURNEY_ID, 'consignment-details')
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
    buildDispatch(SET_ID, dispatchPages)
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

  it('Should send the transit countries on to the transporter list', () => {
    expect(step(transitCountriesPage.id)).toBe(
      pagePath(JOURNEY_ID, transportersPage.slug)
    )
  })

  it('Should send the transporter list on to the documents, whichever type the pick carries', () => {
    expect(step(transportersPage.id)).toBe(
      pagePath(JOURNEY_ID, documentsPage.slug)
    )
    expect(
      next(transportersPage.id, { ...completeSeed, transporterType: 'Private' })
    ).toBe(pagePath(JOURNEY_ID, documentsPage.slug))
  })

  it('Should return null for the transporter add spokes — they are not run steps', () => {
    // The spokes are off the run, so they carry no step of their own — they
    // continue from the list, which is the step they hang off.
    expect(next(transporterAddPage.id, completeSeed)).toBeNull()
    expect(next(transportersSelectPage.id, completeSeed)).toBeNull()
    expect(next(privateTransporterDetailsPage.id, completeSeed)).toBeNull()
  })

  it('Should send the documents on to the roles and addresses', () => {
    expect(step(documentsPage.id)).toBe(
      pagePath(JOURNEY_ID, addressesPage.slug)
    )
  })

  it('Should send the roles and addresses straight on to the contact address, never the CPH number', () => {
    const { contactAddress, ...withoutContact } = completeSeed
    expect(contactAddress).toBeDefined()
    expect(next(addressesPage.id, withoutContact)).toBe(
      pagePath(JOURNEY_ID, consignmentContactSelectPage.slug)
    )
  })

  it('Should send the roles and addresses to the overview when every task is already complete', () => {
    expect(step(addressesPage.id)).toBe(hubPath(JOURNEY_ID))
  })

  it('Should return null for the CPH number page — it is not a run step', () => {
    expect(step(cphNumberPage.id)).toBeNull()
  })

  it('Should end the run on the review page once every task row is ready', () => {
    expect(step(consignmentContactSelectPage.id)).toBe(
      pagePath(JOURNEY_ID, notificationViewPage.slug)
    )
  })

  it('Should end the run on the review page even when the notification is incomplete', () => {
    expect(next(consignmentContactSelectPage.id, lineSeed)).toBe(
      pagePath(JOURNEY_ID, notificationViewPage.slug)
    )
  })

  it('Should rest on the hub after the review page — the run is over', () => {
    expect(step(notificationViewPage.id)).toBe(hubPath(JOURNEY_ID))
  })
})

describe('the run covers the journey', () => {
  // Pages deliberately outside the run: the dashboard sits before a
  // notification exists, and the declaration and confirmation close it after
  // the review page has ended the run. The CPH number page is reached only
  // from its row on the roles and addresses page.
  const OUTSIDE_THE_RUN = [
    'dashboard',
    'cphNumber',
    'declaration',
    'confirmation'
  ]

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

describe('#runBackTarget — the Back link while the opening run is under way', () => {
  it("Should name the origin page as the commodity page's Back link", () => {
    expect(runBackTarget(commoditiesPage.id, JOURNEY_ID)).toBe(
      pagePath(JOURNEY_ID, 'origin')
    )
  })

  it("Should name the commodity page, not the main reason for import, as Commodity details' Back link", () => {
    expect(runBackTarget(consignmentDetailsPage.id, JOURNEY_ID)).toBe(
      pagePath(JOURNEY_ID, 'commodities')
    )
  })

  it('Should name nothing for a step the journey leaves to the overview', () => {
    expect(runBackTarget(importReasonPage.id, JOURNEY_ID)).toBeNull()
    expect(runBackTarget('origin', JOURNEY_ID)).toBeNull()
  })
})
