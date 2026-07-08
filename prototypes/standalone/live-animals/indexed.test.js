import { beforeAll, describe, expect, it } from 'vitest'
import { reconcile } from './engine/evaluate/reconcile.js'
import { FULFILLED, IN_PROGRESS, NOT_STARTED, NA } from './engine/status.js'
import { readyForQuote, sectionStatus } from './flow/section-status.js'
import { sections } from './flow/flow.js'
import { walkObligations } from './registry.js'
import { buildDispatch } from './flow/dispatch.js'
import { dispatchPages } from './features/index.js'

const drivingCoverSection = sections.find(
  (section) => section.id === 'your-driving-and-cover'
)

describe('indexed obligations are first-class', () => {
  // sectionStatus / readyForQuote read the dispatch index (collectsOf), so the
  // boot inversion must run first — same as dispatch.test / contract.test.
  beforeAll(() => buildDispatch(dispatchPages))

  it('Should enumerate sub-obligations at every depth via walkObligations', () => {
    const addresses = [...walkObligations()].map((node) => node.templatePath)
    expect(addresses).toContain('claims')
    expect(addresses).toContain('claims.claimType')
    expect(addresses).toContain('claims.claimAmount')
  })

  it('Should scope each stored claim instance path when the collection is in scope', () => {
    const { inScope } = reconcile({
      hadClaims: 'yes',
      claims: [
        { claimType: 'accident', claimAmount: '500' },
        { claimType: 'theft', claimAmount: '900' }
      ]
    })
    expect(inScope.has('claims')).toBe(true)
    expect(inScope.has('claims[0].claimType')).toBe(true)
    expect(inScope.has('claims[0].claimAmount')).toBe(true)
    expect(inScope.has('claims[1].claimType')).toBe(true)
    expect(inScope.has('claims[1].claimAmount')).toBe(true)
  })

  it('Should not scope any claim sub-obligation when the collection is out of scope', () => {
    const { inScope } = reconcile({
      hadClaims: 'no',
      claims: [{ claimType: 'accident', claimAmount: '500' }]
    })
    expect(inScope.has('claims')).toBe(false)
    expect(inScope.has('claims[0].claimType')).toBe(false)
  })

  it('Should wipe the whole collection as a single root path when it leaves scope', () => {
    const { wiped } = reconcile({
      hadClaims: 'no',
      claims: [{ claimType: 'accident', claimAmount: '500' }]
    })
    const wipedKeys = wiped.map((path) =>
      Array.isArray(path) ? path.join('.') : path
    )
    expect(wipedKeys).toContain('claims')
    expect(wiped.some((path) => Array.isArray(path) && path.length > 1)).toBe(
      false
    )
  })

  it('Should treat a claim with a blank required sub-field as incomplete (per-item completeness)', () => {
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
      hadClaims: 'yes',
      claims: [{ claimType: 'accident', claimAmount: '500' }],
      coverType: 'comprehensive',
      declaration: 'confirmed'
    }
    const incomplete = {
      ...complete,
      claims: [{ claimAmount: '500' }]
    }
    expect(readyForQuote(complete, reconcile(complete).inScope)).toBe(true)
    expect(readyForQuote(incomplete, reconcile(incomplete).inScope)).toBe(false)
  })

  it('Should roll per-item completeness into the driving-and-cover section status', () => {
    const withIncompleteClaim = {
      hadClaims: 'yes',
      claims: [{ claimAmount: '500' }],
      coverType: 'comprehensive'
    }
    const withCompleteClaim = {
      hadClaims: 'yes',
      claims: [{ claimType: 'accident', claimAmount: '500' }],
      coverType: 'comprehensive'
    }
    expect(
      sectionStatus(
        drivingCoverSection,
        withIncompleteClaim,
        reconcile(withIncompleteClaim).inScope
      )
    ).toBe(IN_PROGRESS)
    expect(
      sectionStatus(
        drivingCoverSection,
        withCompleteClaim,
        reconcile(withCompleteClaim).inScope
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
