import { beforeAll, describe, expect, it } from 'vitest'

import { buildDispatch } from '../flow/dispatch.js'
import { readyForQuote } from '../flow/section-status.js'
import { configureReadyForQuote } from '../engine/read.js'
import { dispatchPages } from '../features/index.js'
import { simulateJourney } from './simulate.js'

describe('#simulateJourney', () => {
  // The quote-readiness gate flows through the status roll-up, which reads the
  // boot-built dispatch index — so replicate boot, exactly as the app does.
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
  })

  it('Should walk a plain persona (no claims, no add-ons) straight through', () => {
    const pages = simulateJourney({
      hadClaims: 'no',
      coverType: 'comprehensive'
    })
    expect(pages).toContain('driving-history')
    expect(pages).toContain('cover-type')
    expect(pages).not.toContain('claims')
    expect(pages).not.toContain('drivers')
    expect(pages).not.toContain('modifications-describe')
    expect(pages.indexOf('driving-history')).toBeLessThan(
      pages.indexOf('cover-type')
    )
    expect(pages.indexOf('cover-type')).toBeLessThan(pages.indexOf('addons'))
  })

  it('Should insert the gated claims page exactly when hadClaims is yes', () => {
    const pages = simulateJourney({ hadClaims: 'yes' })
    expect(pages).toContain('claims')
    expect(pages.indexOf('driving-history')).toBeLessThan(
      pages.indexOf('claims')
    )
    expect(pages.indexOf('claims')).toBeLessThan(pages.indexOf('cover-type'))
  })

  it('Should open only the add-on section a persona selected', () => {
    const pages = simulateJourney({ addons: ['named-driver'] })
    expect(pages).toContain('drivers')
    expect(pages).not.toContain('modifications-describe')
    expect(pages).not.toContain('protected-ncd-years')
  })

  it('Should reveal the quote page only once the journey is ready to quote', () => {
    const notReady = simulateJourney({ countryOfOrigin: 'FR' })
    expect(notReady).not.toContain('quote-summary')

    const ready = simulateJourney({
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
      hadClaims: 'no',
      coverType: 'comprehensive',
      declaration: 'confirmed'
    })
    expect(ready).toContain('quote-summary')
  })
})
