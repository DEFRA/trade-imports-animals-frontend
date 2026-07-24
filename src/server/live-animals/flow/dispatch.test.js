import { beforeAll, describe, expect, it, vi } from 'vitest'
import { dispatchPages } from '../features/index.js'
import { makeScope } from '../engine/index.js'
import { evaluateAnswers } from '../bridge/evaluation.js'
import * as obligationSource from './obligation-source.js'
import { readyForCheckYourAnswers } from './section-status.js'
import {
  buildDispatch,
  collectsOf,
  pageOfObligation,
  slugOfPage
} from './dispatch.js'
import { nextInSection, sectionEntry } from './navigation.js'

describe('#buildDispatch', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
  })

  it('Should build the dispatch without throwing for every non-system obligation', () => {
    expect(() => buildDispatch(dispatchPages)).not.toThrow()
  })

  it('Should resolve pageOfObligation for a top-level obligation', () => {
    expect(pageOfObligation('countryOfOrigin')).toBe('origin')
  })

  it('Should resolve pageOfObligation for a collection obligation', () => {
    expect(pageOfObligation('commodityLines')).toBe('commodities')
  })

  it('Should resolve pageOfObligation for a gated obligation', () => {
    expect(pageOfObligation('commercialTransporter')).toBe(
      'transporters-select'
    )
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
      expect(() => buildDispatch([{ id: 'x', collects: [] }])).toThrow(
        /contains a path metacharacter/
      )
      expect(() => buildDispatch([{ id: 'x', collects: [] }])).toThrow(
        /"bad\.id"/
      )
    } finally {
      spy.mockRestore()
      buildDispatch(dispatchPages)
    }
  })

  it('Should crash boot when a single obligation is collected by two pages', () => {
    const twoOwners = [
      { id: 'a', collects: ['countryOfOrigin'] },
      { id: 'b', collects: ['countryOfOrigin'] }
    ]
    try {
      expect(() => buildDispatch(twoOwners)).toThrow(/collected by two pages/)
      expect(() => buildDispatch(twoOwners)).toThrow(/"a" and "b"/)
    } finally {
      buildDispatch(dispatchPages)
    }
  })

  it('Should fall back to the hub when the page belongs to no section', () => {
    expect(
      nextInSection(
        'not-a-real-page',
        {
          inScope: new Set(),
          answered: () => true
        },
        'journey-1'
      )
    ).toMatch(/\/notifications\/journey-1$/)
  })

  it('Should crash boot when an obligation (and its derived sub-obligations) is uncovered', () => {
    const withoutCommodities = dispatchPages.filter(
      (page) => page.id !== 'commodities'
    )
    expect(() => buildDispatch(withoutCommodities)).toThrow(
      /collected by no page/
    )
    expect(() => buildDispatch(withoutCommodities)).toThrow(/commodityLines/)
    buildDispatch(dispatchPages)
  })

  it('Should resolve a sub-obligation to its collection owner by template and instance address', () => {
    expect(pageOfObligation('commodityLines.commoditySelection')).toBe(
      'commodities'
    )
    expect(pageOfObligation('commodityLines[0].commoditySelection')).toBe(
      'commodities'
    )
    expect(pageOfObligation('commodityLines[0]')).toBe('commodities')
  })

  it('Should walk the transport section, skipping the spokes the type gates out', () => {
    const answered = () => true
    const scopeNoType = { inScope: makeScope({}).inScope, answered }
    const scopeCommercial = {
      inScope: makeScope({ transporterType: 'Commercial' }).inScope,
      answered
    }
    const scopePrivate = {
      inScope: makeScope({ transporterType: 'Private' }).inScope,
      answered
    }
    expect(nextInSection('transporters', scopeCommercial, 'journey-1')).toMatch(
      /\/transporters\/select$/
    )
    expect(nextInSection('transporters', scopePrivate, 'journey-1')).toMatch(
      /\/transporters\/private$/
    )
    expect(nextInSection('transporters', scopeNoType, 'journey-1')).toMatch(
      /\/notifications\/journey-1$/
    )
    expect(
      nextInSection('private-transporter-details', scopePrivate, 'journey-1')
    ).toMatch(/\/notifications\/journey-1$/)
  })

  it('Should enter a section at its first gated-in page', () => {
    const scope = { inScope: makeScope({}).inScope, answered: () => true }
    expect(sectionEntry('transport', scope, 'journey-1')).toMatch(
      /\/port-of-entry$/
    )
  })

  it('Should report ready-to-submit only once every section is complete', () => {
    const complete = {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'no',
      reasonForImport: 'internalMarket',
      purposeInInternalMarket: 'breeding',
      animalsCertifiedFor: 'slaughter',
      containsUnweanedAnimals: 'no',
      countyParishHoldingCph: '12/345/6789',
      commodityLines: [
        {
          commoditySelection: 'Cow',
          commodityType: '16',
          speciesSelection: ['1148346'],
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
        }
      ],
      consignor: {
        name: 'Astra Rosales',
        address: {
          addressLine1: '43 East Hague Extension',
          country: 'Switzerland'
        }
      },
      placeOfDestination: {
        name: 'Tech Imports Ltd',
        address: { addressLine1: '643 Main Street', country: 'United Kingdom' }
      },
      placeOfOrigin: {
        name: 'Origin Farm',
        address: { addressLine1: '1 Farm Lane', country: 'Ireland' }
      },
      consignee: {
        name: 'British Livestock Ltd',
        address: {
          addressLine1: '10 Market Street',
          country: 'United Kingdom'
        }
      },
      importer: {
        name: 'Import Co UK',
        address: {
          addressLine1: '20 Trade Road',
          country: 'United Kingdom'
        }
      },
      portOfEntry: 'GB ABD',
      arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
      meansOfTransport: 'AIRPLANE',
      transportIdentification: 'FR-892-LK',
      transportDocumentReference: 'CMR-2026-884721',
      transporterType: 'Commercial',
      commercialTransporter: {
        name: 'García Livestock Transport SL',
        address: {
          addressLine1: '43 East Hague Extension',
          country: 'Switzerland'
        },
        approvalNumber: 'ES-T2-45001294'
      },
      contactAddress: {
        name: 'Animal and Plant Health Agency',
        address: { addressLine1: 'Woodham Lane', country: 'United Kingdom' }
      },
      declaration: 'confirmed'
    }
    const { inScope } = makeScope(complete)
    expect(
      readyForCheckYourAnswers(complete, inScope, evaluateAnswers(complete))
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
