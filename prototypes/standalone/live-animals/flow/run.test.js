import { beforeAll, describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../config.js'
import { dispatchPages } from '../features/index.js'
import {
  commoditiesPage,
  consignmentDetailsPage
} from '../features/commodities/page.js'
import { importReasonPage } from '../features/import-reason/page.js'
import { importPurposePage } from '../features/import-purpose/page.js'
import { additionalDetailsPage } from '../features/additional-details/page.js'
import { makeScope } from '../engine/index.js'
import { configureReadyForCheckYourAnswers } from '../engine/read.js'
import { buildDispatch } from './dispatch.js'
import { readyForCheckYourAnswers } from './section-status.js'
import { ANIMAL_IDENTIFIERS_STEP, nextRunTarget } from './run.js'

const next = (stepId, answers) => nextRunTarget(stepId, makeScope(answers))

const lineSeed = {
  countryOfOrigin: 'FR',
  commodityLines: [{ commoditySelection: 'Cat', speciesSelection: '923501' }]
}

describe('#nextRunTarget — the opening run sequence', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })

  it('Should send the entry filter to origin on a blank journey', () => {
    expect(next('importTypeFilter', {})).toBe(pagePath('origin'))
  })

  it('Should send origin to the commodity search page once the country is answered', () => {
    expect(next('origin', { countryOfOrigin: 'FR' })).toBe(
      pagePath('commodities')
    )
  })

  it('Should send the search page to the consignment details page once a line exists', () => {
    expect(next(commoditiesPage.id, lineSeed)).toBe(
      pagePath('consignment-details')
    )
  })

  it('Should skip the consignment details page while no line exists — with no line the whole tail is gated and the run collapses to the hub', () => {
    expect(next(commoditiesPage.id, { countryOfOrigin: 'FR' })).toBe(hubPath())
  })

  it('Should send the consignment details page to import reason', () => {
    expect(next(consignmentDetailsPage.id, lineSeed)).toBe(
      pagePath('import-reason')
    )
  })

  it('Should send import reason to the conditional purpose page only when the purpose is in scope', () => {
    expect(
      next(importReasonPage.id, {
        ...lineSeed,
        reasonForImport: 'internalMarket'
      })
    ).toBe(pagePath('import-purpose'))
    expect(
      next(importReasonPage.id, { ...lineSeed, reasonForImport: 'transit' })
    ).toBe(pagePath('commodities/0/identifiers'))
  })

  it("Should send import purpose to the first line's identification", () => {
    expect(
      next(importPurposePage.id, {
        ...lineSeed,
        reasonForImport: 'internalMarket'
      })
    ).toBe(pagePath('commodities/0/identifiers'))
  })

  it('Should pass identification through to additional details with zero identifier records', () => {
    expect(next(ANIMAL_IDENTIFIERS_STEP, lineSeed)).toBe(
      pagePath('additional-details')
    )
  })

  it('Should end the run on the hub after additional details', () => {
    expect(next(additionalDetailsPage.id, lineSeed)).toBe(hubPath())
  })

  it('Should collapse to the hub when every later step is unreachable', () => {
    expect(
      next(importPurposePage.id, {
        countryOfOrigin: 'FR',
        reasonForImport: 'internalMarket'
      })
    ).toBe(hubPath())
  })

  it('Should return null for a page outside the run', () => {
    expect(next('documents', lineSeed)).toBe(null)
    expect(next('portOfEntry', lineSeed)).toBe(null)
  })
})
