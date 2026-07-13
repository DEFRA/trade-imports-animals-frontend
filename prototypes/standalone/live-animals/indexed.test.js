import { beforeAll, describe, expect, it } from 'vitest'
import { reconcile } from './engine/evaluate/reconcile.js'
import { FULFILLED, IN_PROGRESS, OPTIONAL } from './engine/status.js'
import {
  readyForCheckYourAnswers,
  sectionStatus
} from './flow/section-status.js'
import { sections } from './flow/flow.js'
import { walkObligations } from './registry.js'
import { buildDispatch } from './flow/dispatch.js'
import { dispatchPages } from './features/index.js'

const commoditiesSection = sections.find(
  (section) => section.id === 'commodities'
)
const documentsSection = sections.find((section) => section.id === 'documents')

const completeDocument = {
  accompanyingDocumentType: 'health-certificate',
  accompanyingDocumentAttachmentType: 'upload',
  accompanyingDocumentReference: 'HC-2026-01',
  accompanyingDocumentDateOfIssue: { day: '1', month: '2', year: '2026' }
}

describe('indexed obligations are first-class', () => {
  beforeAll(() => buildDispatch(dispatchPages))

  it('Should enumerate sub-obligations at every depth via walkObligations', () => {
    const addresses = [...walkObligations()].map((node) => node.templatePath)
    expect(addresses).toContain('commodityLines')
    expect(addresses).toContain('commodityLines.commoditySelection')
    expect(addresses).toContain('commodityLines.numberOfAnimalsQuantity')
  })

  it('Should scope each stored commodity line instance path when the collection is in scope', () => {
    const { inScope } = reconcile({
      commodityLines: [
        { commoditySelection: 'Cow', numberOfAnimalsQuantity: '25' },
        { commoditySelection: '010420 - Goats', numberOfAnimalsQuantity: '9' }
      ]
    })
    expect(inScope.has('commodityLines')).toBe(true)
    expect(inScope.has('commodityLines[0].commoditySelection')).toBe(true)
    expect(inScope.has('commodityLines[0].numberOfAnimalsQuantity')).toBe(true)
    expect(inScope.has('commodityLines[1].commoditySelection')).toBe(true)
    expect(inScope.has('commodityLines[1].numberOfAnimalsQuantity')).toBe(true)
  })

  it('Should treat a commodity line with a blank required sub-field as incomplete (per-item completeness)', () => {
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
          typeSelection: 'Domestic',
          speciesSelection: ['1148346'],
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '25',
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
      portOfEntry: 'Aberdeen Airport',
      arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
      meansOfTransport: 'Airplane',
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
    const incomplete = {
      ...complete,
      commodityLines: [{ commoditySelection: 'Cow' }]
    }
    expect(
      readyForCheckYourAnswers(complete, reconcile(complete).inScope)
    ).toBe(true)
    expect(
      readyForCheckYourAnswers(incomplete, reconcile(incomplete).inScope)
    ).toBe(false)
  })

  it('Should read an untouched optional section as OPTIONAL (not Completed, does not count)', () => {
    expect(sectionStatus(documentsSection, {}, reconcile({}).inScope)).toBe(
      OPTIONAL
    )
  })

  it('Should read an optional section with an incomplete entry as IN_PROGRESS', () => {
    const answers = {
      documents: [{ accompanyingDocumentType: 'health-certificate' }]
    }
    expect(
      sectionStatus(documentsSection, answers, reconcile(answers).inScope)
    ).toBe(IN_PROGRESS)
  })

  it('Should read an optional section with a complete entry as FULFILLED', () => {
    const answers = { documents: [completeDocument] }
    expect(
      sectionStatus(documentsSection, answers, reconcile(answers).inScope)
    ).toBe(FULFILLED)
  })

  it('Should roll per-item completeness into the commodities section status', () => {
    const withIncompleteLine = {
      commodityLines: [{ commoditySelection: 'Cow' }]
    }
    const withCompleteLine = {
      commodityLines: [
        {
          commoditySelection: 'Cow',
          typeSelection: 'Domestic',
          speciesSelection: ['1148346'],
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '25',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
        }
      ]
    }
    expect(
      sectionStatus(
        commoditiesSection,
        withIncompleteLine,
        reconcile(withIncompleteLine).inScope
      )
    ).toBe(IN_PROGRESS)
    expect(
      sectionStatus(
        commoditiesSection,
        withCompleteLine,
        reconcile(withCompleteLine).inScope
      )
    ).toBe(FULFILLED)
  })
})
