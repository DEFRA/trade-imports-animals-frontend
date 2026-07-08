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
        { commoditySelection: '0102 - Cattle', numberOfAnimalsQuantity: '25' },
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
      reasonForImport: 'internal-market',
      purposeInInternalMarket: 'breeding',
      animalsCertifiedFor: 'slaughter',
      containsUnweanedAnimals: 'no',
      countyParishHoldingCph: '12/345/6789',
      commodityLines: [
        {
          commoditySelection: '0102 - Cattle',
          typeSelection: 'domestic',
          speciesSelection: ['bos-taurus'],
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '25',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
        }
      ],
      consignor: {
        name: 'Laiterie du Nord SARL',
        address: { addressLine1: '12 Rue de la Gare', country: 'France' }
      },
      placeOfDestination: {
        name: 'Tech Imports Ltd',
        address: { addressLine1: '643 Main Street', country: 'United Kingdom' }
      },
      placeOfOrigin: {
        name: 'Ferme des Trois Vallées',
        address: { addressLine1: '3 Chemin des Prés', country: 'France' }
      },
      consignee: {
        name: 'Yorkshire Dales Livestock Ltd',
        address: {
          addressLine1: 'Unit 4, Auction Mart Lane',
          country: 'United Kingdom'
        }
      },
      importer: {
        name: 'Albion Livestock Imports Ltd',
        address: {
          addressLine1: '18 Harbour Road',
          country: 'United Kingdom'
        }
      },
      portOfEntry: 'ABERDEEN',
      arrivalDateAtPort: { day: '12', month: '12', year: '2026' },
      meansOfTransport: 'Airplane',
      transportIdentification: 'FR-892-LK',
      transportDocumentReference: 'CMR-2026-884721',
      transporterType: 'Commercial transporter',
      commercialTransporter: {
        name: 'Channel Livestock Logistics Ltd',
        address: {
          addressLine1: '18 Eastern Docks',
          country: 'United Kingdom'
        },
        approvalNumber: 'UK/DOVER/T2/00012345'
      },
      contactAddress: {
        name: 'Animal and Plant Health Agency',
        address: { addressLine1: 'Woodham Lane', country: 'United Kingdom' }
      },
      declaration: 'confirmed'
    }
    const incomplete = {
      ...complete,
      commodityLines: [{ commoditySelection: '0102 - Cattle' }]
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
      commodityLines: [{ commoditySelection: '0102 - Cattle' }]
    }
    const withCompleteLine = {
      commodityLines: [
        {
          commoditySelection: '0102 - Cattle',
          typeSelection: 'domestic',
          speciesSelection: ['bos-taurus'],
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
