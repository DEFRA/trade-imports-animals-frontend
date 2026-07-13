import { beforeAll, describe, expect, it, vi } from 'vitest'
import { dispatchPages } from '../features/index.js'
import { reconcile } from '../engine/evaluate/reconcile.js'
import * as registry from '../registry.js'
import { readyForCheckYourAnswers } from './section-status.js'
import {
  buildDispatch,
  collectsOf,
  pageOfObligation,
  slugOfPage
} from './dispatch.js'
import { nextInSection, sectionEntry } from './navigation.js'

describe('dispatch + flow', () => {
  beforeAll(() => buildDispatch(dispatchPages))

  it('Should assert coverage of every non-system obligation to exactly one page', () => {
    expect(() => buildDispatch(dispatchPages)).not.toThrow()
    expect(pageOfObligation('countryOfOrigin')).toBe('origin')
    expect(pageOfObligation('commodityLines')).toBe('commodities')
    expect(pageOfObligation('commercialTransporter')).toBe(
      'transporters-select'
    )
    expect(collectsOf('origin')).toContain('countryOfOrigin')
    expect(slugOfPage('origin')).toBe('origin')
  })

  it('Should crash boot when an obligation id carries a path metacharacter', () => {
    const spy = vi
      .spyOn(registry, 'walkObligations')
      .mockImplementation(function* () {
        yield {
          templatePath: 'commodityLines.animalIdentifiers',
          obligation: { id: 'bad.id' }
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
      nextInSection('not-a-real-page', {
        inScope: new Set(),
        answered: () => true
      })
    ).toMatch(/\/hub$/)
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
    const scopeNoType = { inScope: reconcile({}).inScope, answered }
    const scopeCommercial = {
      inScope: reconcile({ transporterType: 'Commercial transporter' }).inScope,
      answered
    }
    const scopePrivate = {
      inScope: reconcile({ transporterType: 'Private transporter' }).inScope,
      answered
    }
    expect(nextInSection('transporters', scopeCommercial)).toMatch(
      /\/transporters\/select$/
    )
    expect(nextInSection('transporters', scopePrivate)).toMatch(
      /\/transporters\/private$/
    )
    expect(nextInSection('transporters', scopeNoType)).toMatch(/\/hub$/)
    expect(nextInSection('private-transporter-details', scopePrivate)).toMatch(
      /\/hub$/
    )
  })

  it('Should enter a section at its first gated-in page', () => {
    const scope = { inScope: reconcile({}).inScope, answered: () => true }
    expect(sectionEntry('transport', scope)).toMatch(/\/port-of-entry$/)
  })

  it('Should report ready-to-submit only once every section is complete', () => {
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
          commoditySelection: 'Cow',
          typeSelection: 'Domestic',
          speciesSelection: ['1148346'],
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
      portOfEntry: 'Aberdeen Airport',
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
    const { inScope } = reconcile(complete)
    expect(readyForCheckYourAnswers(complete, inScope)).toBe(true)

    const incomplete = {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'no'
    }
    expect(
      readyForCheckYourAnswers(incomplete, reconcile(incomplete).inScope)
    ).toBe(false)
  })
})
