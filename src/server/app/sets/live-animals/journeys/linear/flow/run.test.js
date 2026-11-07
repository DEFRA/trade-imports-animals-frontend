import { SET_ID } from '../../../set.js'
import { beforeAll, describe, expect, it } from 'vitest'

import { pagePath } from '../../../../../shared/paths.js'
import { completeNotification } from '../../../../../engine/test-support.js'
import { dispatchPages } from '../features/index.js'
import {
  animalIdentificationPage,
  commoditiesPage,
  consignmentDetailsPage
} from '../features/commodities/page.js'
import { originPage } from '../features/origin/page.js'
import { importReasonPage } from '../features/import-reason/page.js'
import { additionalDetailsPage } from '../features/additional-details/page.js'
import {
  portOfEntryPage,
  transitCountriesPage,
  transportersPage
} from '../features/transport/page.js'
import { documentsPage } from '../features/documents/page.js'
import { addressesPage } from '../features/addresses/page.js'
import { consignmentContactSelectPage } from '../features/contact/page.js'
import { dashboardPage } from '../features/dashboard/page.js'
import { makeScope } from '../../../../../engine/index.js'
import { buildDispatch } from '../../../../../flow/dispatch.js'
import { previousRunTarget, RUN_STEPS } from './run.js'
import { allFlowPages } from './flow.js'
import {
  FELIS_CATUS_ROW,
  STRUTHIO_ROW
} from '../features/commodities/search/test-support.js'

const JOURNEY_ID = 'journey-1'

const lineSeed = {
  countryOfOrigin: 'FR',
  commodityLines: [FELIS_CATUS_ROW]
}

const completeSeed = completeNotification()

describe('#previousRunTarget — where Back goes during the opening run', () => {
  beforeAll(() => {
    buildDispatch(SET_ID, dispatchPages)
  })

  const ostrichSeed = {
    countryOfOrigin: 'FR',
    commodityLines: [STRUTHIO_ROW]
  }
  const previous = (stepId, answers) =>
    previousRunTarget(
      stepId,
      { scope: makeScope(answers), answers },
      JOURNEY_ID
    )

  it('Should send the commodities page back to the origin page', () => {
    expect(previous(commoditiesPage.id, lineSeed)).toBe(
      pagePath(JOURNEY_ID, originPage.slug)
    )
  })

  it('Should send the import reason page back to the commodities page', () => {
    expect(previous(importReasonPage.id, lineSeed)).toBe(
      pagePath(JOURNEY_ID, commoditiesPage.slug)
    )
  })

  it('Should send the consignment details page back to the commodities page, not to the import reason page', () => {
    expect(previous(consignmentDetailsPage.id, lineSeed)).toBe(
      pagePath(JOURNEY_ID, commoditiesPage.slug)
    )
  })

  it('Should send the additional details page back to the animal identification page when a chosen species needs identifiers', () => {
    expect(previous(additionalDetailsPage.id, lineSeed)).toBe(
      pagePath(JOURNEY_ID, animalIdentificationPage.slug)
    )
  })

  it('Should send the additional details page back to the consignment details page when no chosen species needs identifiers', () => {
    expect(previous(additionalDetailsPage.id, ostrichSeed)).toBe(
      pagePath(JOURNEY_ID, consignmentDetailsPage.slug)
    )
  })

  it('Should send the transit countries back to the port of entry page', () => {
    expect(previous(transitCountriesPage.id, completeSeed)).toBe(
      pagePath(JOURNEY_ID, portOfEntryPage.slug)
    )
  })

  it('Should give no run Back to the steps whose Back link stays on the overview', () => {
    for (const step of [
      originPage,
      animalIdentificationPage,
      portOfEntryPage,
      transportersPage,
      documentsPage,
      addressesPage,
      consignmentContactSelectPage
    ]) {
      expect(previous(step.id, completeSeed)).toBeNull()
    }
  })

  it('Should give no run Back to a page outside the run', () => {
    expect(previous(dashboardPage.id, lineSeed)).toBeNull()
  })
})

describe('the run covers the journey', () => {
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
