import { beforeAll, describe, expect, it } from 'vitest'

import { dispatchPages } from '../features/index.js'
import { transportersSelectPage } from '../features/transport/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'
import { makeScope } from '../engine/index.js'
import { configureReadyForCheckYourAnswers } from '../engine/read.js'
import { enumerateScopeStates } from '../analysis/flow-reachability.js'
import { buildDispatch } from './dispatch.js'
import { sections } from './flow.js'
import { readyForCheckYourAnswers } from './section-status.js'
import { pageGatePasses, sectionGatePasses } from './gates.js'

describe('#pageGatePasses / #sectionGatePasses', () => {
  const syntheticGatedSection = {
    id: 'synthetic',
    gate: (scope) => scope.pass === true,
    pages: []
  }
  const syntheticGatedPage = { id: 'synthetic', gate: (scope) => scope.pass }
  const derivedSection = sections.find((section) => !section.gate)

  it('Should fail loud when a derived gate is consulted before the dispatch index is built', () => {
    const scope = { inScope: new Set() }
    expect(() => sectionGatePasses(derivedSection, scope)).toThrow(
      /buildDispatch/
    )
    expect(() => pageGatePasses(transportersSelectPage, scope)).toThrow(
      /buildDispatch/
    )
  })

  it('Should evaluate an authored gate without needing the dispatch index', () => {
    expect(sectionGatePasses(syntheticGatedSection, { pass: false })).toBe(
      false
    )
    expect(sectionGatePasses(syntheticGatedSection, { pass: true })).toBe(true)
    expect(pageGatePasses(syntheticGatedPage, { pass: false })).toBe(false)
    expect(pageGatePasses(syntheticGatedPage, { pass: true })).toBe(true)
  })

  it('Should author a gate on the review section alone — every other section derives its gate from the dispatch index', () => {
    const review = sections.find((section) => section.id === 'review')
    expect(sectionGatePasses(review, { readyForCheckYourAnswers: false })).toBe(
      false
    )
    expect(sectionGatePasses(review, { readyForCheckYourAnswers: true })).toBe(
      true
    )
    for (const section of sections.filter((s) => s.id !== 'review')) {
      expect(() =>
        sectionGatePasses(section, { inScope: new Set(), answered: () => true })
      ).toThrow(/buildDispatch/)
    }
  })

  describe('once the dispatch index is built', () => {
    beforeAll(() => {
      buildDispatch(dispatchPages)
      configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
    })

    it('Should pass the derived transporter-select page gate exactly when the commercial transporter is owed, in every scope state', () => {
      const answered = () => true
      for (const answers of enumerateScopeStates()) {
        const { inScope } = makeScope(answers)
        expect(
          pageGatePasses(transportersSelectPage, { inScope, answered })
        ).toBe(inScope.has('commercialTransporter'))
      }
    })

    it('Should derive a page that collects nothing as reachable (the empty-collects convention)', () => {
      expect(
        pageGatePasses(notificationViewPage, {
          inScope: new Set(),
          answered: () => true
        })
      ).toBe(true)
    })
  })
})

describe('#sectionGatePasses — RULE 1: mandate-derived flow sequencing', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })

  const sectionById = (id) => sections.find((section) => section.id === id)
  const gatePasses = (id, answers) =>
    sectionGatePasses(sectionById(id), makeScope(answers))

  it('Should always open origin — it owns the first continue obligation, nothing precedes it', () => {
    expect(gatePasses('origin', {})).toBe(true)
  })

  it('Should gate commodities until countryOfOrigin is answered', () => {
    expect(gatePasses('commodities', {})).toBe(false)
    expect(gatePasses('commodities', { countryOfOrigin: 'FR' })).toBe(true)
  })

  it('Should NOT block commodities on its own continue obligation (commoditySelection)', () => {
    expect(gatePasses('commodities', { countryOfOrigin: 'FR' })).toBe(true)
  })

  it('Should gate every post-commodities section until an item-level commoditySelection is answered', () => {
    const afterCommodities = [
      'consignment',
      'documents',
      'addresses',
      'transport',
      'contact'
    ]
    const originOnly = { countryOfOrigin: 'FR' }
    const blankLine = { countryOfOrigin: 'FR', commodityLines: [{}] }
    const filledLine = {
      countryOfOrigin: 'FR',
      commodityLines: [{}, { commoditySelection: 'Cow' }]
    }
    for (const id of afterCommodities) {
      expect(gatePasses(id, originOnly)).toBe(false)
      expect(gatePasses(id, blankLine)).toBe(false)
      expect(gatePasses(id, filledLine)).toBe(true)
    }
  })

  it('Should leave an obligation without enforcedAt unaffected by RULE 1 (backwards-compat)', () => {
    const noDocuments = {
      countryOfOrigin: 'FR',
      commodityLines: [{ commoditySelection: 'Cow' }]
    }
    expect(gatePasses('addresses', noDocuments)).toBe(true)
    expect(gatePasses('transport', noDocuments)).toBe(true)
    expect(gatePasses('contact', noDocuments)).toBe(true)
  })
})

describe('#sectionGatePasses — RULE 2: review gates on submit-readiness (no deadlock)', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })

  const reviewSection = sections.find((section) => section.id === 'review')

  const allAnswerSectionsReady = {
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
        typeSelection: 'Domestic',
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
      address: { addressLine1: '20 Trade Road', country: 'United Kingdom' }
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
    }
  }

  it('Should lock the review section on a blank journey', () => {
    expect(sectionGatePasses(reviewSection, makeScope({}))).toBe(false)
  })

  it('Should open the review section once every answer section is ready — even with the declaration unanswered (no deadlock)', () => {
    expect(
      sectionGatePasses(reviewSection, makeScope(allAnswerSectionsReady))
    ).toBe(true)
  })
})
