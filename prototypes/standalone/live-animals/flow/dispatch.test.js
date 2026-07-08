import { beforeAll, describe, expect, it } from 'vitest'
import { dispatchPages } from '../features/index.js'
import { reconcile } from '../engine/evaluate/reconcile.js'
import { readyForQuote } from './section-status.js'
import { buildDispatch, collectsOf, pageOfObligation } from './dispatch.js'
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
  })

  it('Should crash boot when an obligation (and its derived sub-obligations) is uncovered', () => {
    const withoutCommodities = dispatchPages.filter(
      (page) => page.id !== 'commodities'
    )
    expect(() => buildDispatch(withoutCommodities)).toThrow(
      /collected by no page/
    )
    expect(() => buildDispatch(withoutCommodities)).toThrow(/commodityLines/)
    buildDispatch(dispatchPages) // restore the shared index for later tests
  })

  it('Should resolve a sub-obligation to its collection owner by template and instance address', () => {
    expect(pageOfObligation('commodityLines.commoditySelection')).toBe(
      'commodities'
    )
    // The engine addresses instances in bracketed pathKey form; ownership must
    // resolve that vocabulary too, else per-item change links break.
    expect(pageOfObligation('commodityLines[0].commoditySelection')).toBe(
      'commodities'
    )
    expect(pageOfObligation('commodityLines[0]')).toBe('commodities')
  })

  it('Should walk the transport section, skipping the spokes the type gates out', () => {
    const scopeNoType = { inScope: reconcile({}).inScope }
    const scopeCommercial = {
      inScope: reconcile({ transporterType: 'Commercial transporter' }).inScope
    }
    const scopePrivate = {
      inScope: reconcile({ transporterType: 'Private transporter' }).inScope
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

  it('Should enter an addon section only at its first gated-in page', () => {
    const scope = { inScope: reconcile({ addons: ['protected-ncd'] }).inScope }
    expect(sectionEntry('protected-ncd', scope)).toMatch(
      /\/addons\/protected-ncd\/years$/
    )
  })

  it('Should unlock the quote only once every other section is complete', () => {
    const complete = {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'no',
      reasonForImport: 'internal-market',
      purposeInInternalMarket: 'breeding',
      commodityLines: [
        {
          commoditySelection: '0102 - Cattle',
          typeSelection: 'domestic',
          speciesSelection: ['bos-taurus'],
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '25'
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
    const { inScope } = reconcile(complete)
    expect(readyForQuote(complete, inScope)).toBe(true)

    const incomplete = {
      countryOfOrigin: 'FR',
      regionOfOriginCodeRequirement: 'no'
    }
    expect(readyForQuote(incomplete, reconcile(incomplete).inScope)).toBe(false)
  })
})
