import { SET_ID } from '../../../set.js'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { dispatchPages } from '../features/index.js'
import { makeScope } from '../../../../../engine/index.js'
import { completeNotification } from '../../../../../engine/test-support.js'
import { evaluateAnswers } from '../../../../../bridge/evaluation.js'
import * as obligationSource from '../../../../../bridge/obligation-source.js'
import { readyForCheckYourAnswers } from '../../../../../flow/section-status.js'
import {
  buildDispatch,
  collectsOf,
  pageOfObligation,
  slugOfPage
} from '../../../../../flow/dispatch.js'
import {
  nextStepPath,
  taskRowsOfSection
} from '../../../../../flow/navigation.js'
import { journeySections } from '../../../../../flow/journey-flow.js'

const completeAnswers = completeNotification()

describe('#buildDispatch', () => {
  beforeAll(() => {
    buildDispatch(SET_ID, dispatchPages)
  })

  it('Should build the dispatch without throwing for every non-system obligation', () => {
    expect(() => buildDispatch(SET_ID, dispatchPages)).not.toThrow()
  })

  it('Should resolve pageOfObligation for a top-level obligation', () => {
    expect(pageOfObligation('countryOfOrigin')).toBe('origin')
  })

  it('Should resolve pageOfObligation for a collection obligation', () => {
    expect(pageOfObligation('commodityLines')).toBe('commodities')
  })

  it('Should resolve pageOfObligation for a gated obligation', () => {
    expect(pageOfObligation('commercialTransporter')).toBe('transporters')
    expect(pageOfObligation('privateTransporter')).toBe('transporters')
  })

  it('Should list collectsOf for a page', () => {
    expect(collectsOf('origin')).toContain('countryOfOrigin')
  })

  it('Should return slugOfPage for a page', () => {
    expect(slugOfPage('origin')).toBe('origin')
  })

  it('Should crash boot when an obligation id carries a path metacharacter', () => {
    const spy = vi
      .spyOn(obligationSource, 'walkObligations')
      .mockImplementation(function* () {
        yield {
          templatePath: 'commodityLines.animalIdentifiers',
          obligation: { name: 'bad.id' }
        }
      })
    try {
      expect(() => buildDispatch(SET_ID, [{ id: 'x', collects: [] }])).toThrow(
        /contains a path metacharacter/
      )
      expect(() => buildDispatch(SET_ID, [{ id: 'x', collects: [] }])).toThrow(
        /"bad\.id"/
      )
    } finally {
      spy.mockRestore()
      buildDispatch(SET_ID, dispatchPages)
    }
  })

  it('Should crash boot when a single obligation is collected by two pages', () => {
    const twoOwners = [
      { id: 'a', collects: ['countryOfOrigin'] },
      { id: 'b', collects: ['countryOfOrigin'] }
    ]
    try {
      expect(() => buildDispatch(SET_ID, twoOwners)).toThrow(
        /collected by two pages/
      )
      expect(() => buildDispatch(SET_ID, twoOwners)).toThrow(/"a" and "b"/)
    } finally {
      buildDispatch(SET_ID, dispatchPages)
    }
  })

  it('Should crash boot when an obligation (and its derived sub-obligations) is uncovered', () => {
    const withoutCommodities = dispatchPages.filter(
      (page) => page.id !== 'commodities'
    )
    expect(() => buildDispatch(SET_ID, withoutCommodities)).toThrow(
      /collected by no page/
    )
    expect(() => buildDispatch(SET_ID, withoutCommodities)).toThrow(
      /commodityLines/
    )
    buildDispatch(SET_ID, dispatchPages)
  })

  it('Should resolve a sub-obligation to its collection owner by template and instance address', () => {
    expect(pageOfObligation('commodityLines.commodityCode')).toBe('commodities')
    expect(pageOfObligation('commodityLines[0].commodityCode')).toBe(
      'commodities'
    )
    expect(pageOfObligation('commodityLines[0]')).toBe('commodities')
  })

  it('Should report ready-to-submit only once every section is complete', () => {
    const { inScope } = makeScope(completeAnswers)
    expect(
      readyForCheckYourAnswers(
        completeAnswers,
        inScope,
        evaluateAnswers(completeAnswers)
      )
    ).toBe(true)

    const incomplete = {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'no'
    }
    expect(
      readyForCheckYourAnswers(
        incomplete,
        makeScope(incomplete).inScope,
        evaluateAnswers(incomplete)
      )
    ).toBe(false)
  })
})

describe('#nextStepPath — the next page that applies', () => {
  const JOURNEY_ID = 'journey-1'
  const scopeFor = (answers) => ({
    inScope: makeScope(answers).inScope,
    answered: () => true
  })
  const CONTACT_SLUG = 'consignment/contact/select'
  const ARRIVAL_DETAILS_ID = 'port-of-entry'
  const TRANSPORTERS_SLUG = 'transporters'
  const slugOf = (path) => path?.split(`${JOURNEY_ID}/`)[1]
  const nextSlug = (pageId, answers) =>
    slugOf(nextStepPath(pageId, scopeFor(answers), JOURNEY_ID))

  const pageIdOfSlug = (slug) =>
    journeySections()
      .flatMap((section) => section.pages)
      .find((page) => page.slug === slug).id

  const walkFrom = (pageId, answers) => {
    const slugs = []
    for (
      let slug = nextSlug(pageId, answers);
      slug;
      slug = nextSlug(pageIdOfSlug(slug), answers)
    ) {
      slugs.push(slug)
    }
    return slugs
  }

  beforeAll(() => {
    buildDispatch(SET_ID, dispatchPages)
  })

  it('Should go through the journey in the order Overview lists its tasks', () => {
    expect(walkFrom('origin', completeAnswers)).toEqual([
      'commodities',
      'import-reason',
      'consignment-details',
      'commodities/identification',
      'additional-details',
      'port-of-entry',
      'transit-countries',
      TRANSPORTERS_SLUG,
      'accompanying-documents',
      'addresses',
      CONTACT_SLUG
    ])
  })

  it.each(['AIRPLANE', 'VESSEL'])(
    'Should pass over the transit countries when the consignment travels by %s',
    (meansOfTransport) => {
      expect(
        nextSlug(ARRIVAL_DETAILS_ID, { ...completeAnswers, meansOfTransport })
      ).toBe(TRANSPORTERS_SLUG)
    }
  )

  it.each(['ROAD_VEHICLE', 'RAILWAY'])(
    'Should go from the arrival details to the transit countries by %s with every other answer blank',
    (meansOfTransport) => {
      expect(nextSlug(ARRIVAL_DETAILS_ID, { meansOfTransport })).toBe(
        'transit-countries'
      )
    }
  )

  it('Should go from the main import reason to Commodity details with only the country of origin saved', () => {
    expect(nextSlug('import-reason', { countryOfOrigin: 'FR' })).toBe(
      'consignment-details'
    )
  })

  it('Should go from Roles and addresses to Contact address even when every other task is complete', () => {
    expect(nextSlug('addresses', completeAnswers)).toBe(CONTACT_SLUG)
  })

  it('Should go from the CPH number page on to Roles and addresses', () => {
    expect(nextSlug('cphNumber', completeAnswers)).toBe('addresses')
  })

  it('Should go on from Contact address to nothing, the review page being the fallback', () => {
    expect(
      nextSlug('consignment-contact-select', completeAnswers)
    ).toBeUndefined()
  })

  it('Should refuse a page that belongs to no section', () => {
    expect(() =>
      nextStepPath('not-a-real-page', scopeFor({}), JOURNEY_ID)
    ).toThrow(/not in the journey's sections/)
  })
})

describe('#taskRowsOfSection — what Overview lists under a caption', () => {
  it('Should list the task rows of every section in the order of their first page', () => {
    expect(
      journeySections()
        .filter((section) => taskRowsOfSection(section).length > 0)
        .map((section) => [
          section.id,
          taskRowsOfSection(section).map((row) => row.id)
        ])
    ).toEqual([
      ['about-the-consignment', ['origin', 'commodities', 'importReason']],
      [
        'description-of-the-goods',
        ['consignmentDetails', 'animalIdentification', 'additionalDetails']
      ],
      [
        'transport-and-arrival',
        ['arrivalDetails', 'transitCountries', 'transporter']
      ],
      ['documents', ['documents']],
      ['consignment-parties', ['addresses']],
      ['contact-address', ['contact']]
    ])
  })
})
