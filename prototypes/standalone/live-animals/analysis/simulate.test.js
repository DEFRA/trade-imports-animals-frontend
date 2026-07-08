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

  it('Should walk a plain persona (no transporter type) straight through', () => {
    const pages = simulateJourney({})
    expect(pages).toContain('port-of-entry')
    expect(pages).toContain('transporters')
    expect(pages).not.toContain('transporters-select')
    expect(pages).not.toContain('private-transporter-details')
    expect(pages).not.toContain('modifications-describe')
    expect(pages.indexOf('port-of-entry')).toBeLessThan(
      pages.indexOf('transporters')
    )
    expect(pages.indexOf('transporters')).toBeLessThan(
      pages.indexOf('consignment-contact-select')
    )
  })

  it('Should insert the gated transporter spoke exactly for the chosen type', () => {
    const pages = simulateJourney({
      transporterType: 'Commercial transporter'
    })
    expect(pages).toContain('transporters-select')
    expect(pages).not.toContain('private-transporter-details')
    expect(pages.indexOf('transporters')).toBeLessThan(
      pages.indexOf('transporters-select')
    )
  })

  it('Should open only the add-on section a persona selected', () => {
    // The addons picker page went in inc-024 — nothing writes this answer in
    // the running journey any more, but seeding it directly still exercises
    // the dynamic-section gating that survives until inc-026/027.
    const pages = simulateJourney({ addons: ['modifications'] })
    expect(pages).toContain('modifications-describe')
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
      declaration: 'confirmed'
    })
    expect(ready).toContain('quote-summary')
  })
})
