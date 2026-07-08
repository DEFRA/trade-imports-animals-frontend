import { beforeAll, describe, expect, it } from 'vitest'
import { reconcile } from './engine/evaluate/reconcile.js'
import { FULFILLED, IN_PROGRESS, NOT_STARTED, NA } from './engine/status.js'
import { readyForQuote, sectionStatus } from './flow/section-status.js'
import { sections } from './flow/flow.js'
import { walkObligations } from './registry.js'
import { buildDispatch } from './flow/dispatch.js'
import { dispatchPages } from './features/index.js'

const commoditiesSection = sections.find(
  (section) => section.id === 'commodities'
)

describe('indexed obligations are first-class', () => {
  // sectionStatus / readyForQuote read the dispatch index (collectsOf), so the
  // boot inversion must run first — same as dispatch.test / contract.test.
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

  it('Should not scope any driver sub-obligation when the collection is out of scope', () => {
    const { inScope } = reconcile({
      addons: [],
      drivers: [{ driverName: 'Sam', relationship: 'spouse' }]
    })
    expect(inScope.has('drivers')).toBe(false)
    expect(inScope.has('drivers[0].driverName')).toBe(false)
  })

  it('Should wipe the whole collection as a single root path when it leaves scope', () => {
    const { wiped } = reconcile({
      addons: [],
      drivers: [{ driverName: 'Sam', relationship: 'spouse' }]
    })
    const wipedKeys = wiped.map((path) =>
      Array.isArray(path) ? path.join('.') : path
    )
    expect(wipedKeys).toContain('drivers')
    expect(wiped.some((path) => Array.isArray(path) && path.length > 1)).toBe(
      false
    )
  })

  it('Should treat a commodity line with a blank required sub-field as incomplete (per-item completeness)', () => {
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
    const incomplete = {
      ...complete,
      commodityLines: [{ commoditySelection: '0102 - Cattle' }]
    }
    expect(readyForQuote(complete, reconcile(complete).inScope)).toBe(true)
    expect(readyForQuote(incomplete, reconcile(incomplete).inScope)).toBe(false)
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
          numberOfAnimalsQuantity: '25'
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

/**
 * The named-driver section collects exactly one obligation — the `drivers`
 * collection — so nothing else can carry the section's In Progress state. A
 * partially-filled collection MUST read In Progress, never Not Started:
 * showing "Not started" on the hub while several drivers are already entered
 * is a status lie the journey cannot tolerate.
 */
describe('a section whose only obligation is a collection', () => {
  beforeAll(() => buildDispatch(dispatchPages))

  const namedDriverSection = sections.find(
    (section) => section.id === 'named-driver'
  )
  const statusFor = (answers) =>
    sectionStatus(namedDriverSection, answers, reconcile(answers).inScope)

  it('Should be In Progress — not Not Started — while the collection is partially filled', () => {
    const answers = {
      addons: ['named-driver'],
      drivers: [{ driverName: 'Priya Raman' }]
    }
    expect(statusFor(answers)).toBe(IN_PROGRESS)
    expect(statusFor(answers)).not.toBe(NOT_STARTED)
  })

  it('Should be In Progress when a nested claim, deep in the tree, is the only gap', () => {
    const answers = {
      addons: ['named-driver'],
      drivers: [
        {
          driverName: 'Marcus Webb',
          relationship: 'child',
          claims: [{ claimType: 'windscreen', claimAmount: '400' }]
        }
      ]
    }
    expect(statusFor(answers)).toBe(IN_PROGRESS)
  })

  it('Should be Not Started only when the collection is genuinely empty', () => {
    expect(statusFor({ addons: ['named-driver'], drivers: [] })).toBe(
      NOT_STARTED
    )
  })

  it('Should be Fulfilled when every entry — and every nested entry — is complete', () => {
    const answers = {
      addons: ['named-driver'],
      drivers: [
        { driverName: 'Jordan Fielding', relationship: 'spouse', claims: [] },
        {
          driverName: 'Priya Raman',
          relationship: 'named',
          claims: [
            {
              claimType: 'windscreen',
              claimAmount: '300',
              windscreenProvider: 'autoglass'
            }
          ]
        }
      ]
    }
    expect(statusFor(answers)).toBe(FULFILLED)
  })

  it('Should be Not Applicable when the named-driver add-on is not selected', () => {
    expect(statusFor({ addons: [], drivers: [] })).toBe(NA)
  })
})
