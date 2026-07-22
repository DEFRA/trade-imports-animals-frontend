import { readFileSync } from 'node:fs'
import { beforeAll, describe, it, expect } from 'vitest'
import { makeScope, rawInScope } from './scope.js'
import { configureReadyForCheckYourAnswers } from '../engine/read.js'

// The scope projection, pinned against the manifest: each gate scopes its
// obligation in/out as the manifest declares, positional keys project under
// multi-line/multi-unit answers, and makeScope returns the scope object the
// controllers consume.

const happyPath = JSON.parse(
  readFileSync(new URL('../spec/fixtures/happy-path.json', import.meta.url))
).values

// makeScope computes readyForCheckYourAnswers via the boot-injected fn.
beforeAll(() => configureReadyForCheckYourAnswers(() => false))

const resolveRegion = (answers) => ({
  regionOfOriginCodeRequirement: 'yes',
  regionOfOriginCode: 'FR-75',
  ...answers
})

const line = (commodity, units) => ({
  commoditySelection: commodity,
  speciesSelection: '1148346',
  numberOfAnimalsQuantity: String(units.length),
  animalIdentifiers: units
})

describe('scope bridge — per-gate scoping (B)', () => {
  it('Should keep regionOfOriginCode in scope whatever the requirement answers (retain-value)', () => {
    expect(
      makeScope(resolveRegion({ countryOfOrigin: 'FR' })).has(
        'regionOfOriginCode'
      )
    ).toBe(true)
    expect(
      makeScope({
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        regionOfOriginCode: 'FR-75'
      }).has('regionOfOriginCode')
    ).toBe(true)
    // Unanswered requirement — still in scope, optional.
    expect(makeScope({ countryOfOrigin: 'FR' }).has('regionOfOriginCode')).toBe(
      true
    )
  })

  it('Should scope purposeInInternalMarket only under the internalMarket reason', () => {
    expect(
      makeScope(
        resolveRegion({
          reasonForImport: 'internalMarket',
          purposeInInternalMarket: 'breeding'
        })
      ).has('purposeInInternalMarket')
    ).toBe(true)
    expect(
      makeScope(resolveRegion({ reasonForImport: 'research' })).has(
        'purposeInInternalMarket'
      )
    ).toBe(false)
  })

  it('Should scope the commercial transporter + land-transit branch', () => {
    const scope = makeScope(
      resolveRegion({
        transporterType: 'Commercial',
        meansOfTransport: 'ROAD_VEHICLE',
        transitedCountries: ['FR']
      })
    )
    expect(scope.has('commercialTransporter')).toBe(true)
    expect(scope.has('transitedCountries')).toBe(true)
  })

  it('Should scope the private transporter + non-land branch', () => {
    const scope = makeScope(
      resolveRegion({
        transporterType: 'Private',
        meansOfTransport: 'AIRPLANE'
      })
    )
    expect(scope.has('privateTransporter')).toBe(true)
    expect(scope.has('transitedCountries')).toBe(false)
  })

  it('Should project positional keys across multi-line / multi-unit answers', () => {
    const scope = makeScope(
      resolveRegion({
        commodityLines: [
          line('Cow', [
            { animalIdentifierEarTag: 'UK111' },
            { animalIdentifierEarTag: 'UK222' }
          ]),
          line('Horse', [{ horseName: 'Dobbin' }])
        ]
      })
    )
    expect(scope.has('commodityLines[0].commoditySelection')).toBe(true)
    expect(scope.has('commodityLines[1].commoditySelection')).toBe(true)
  })

  it('Should keep the group node in scope for an empty required collection', () => {
    const scope = makeScope(resolveRegion({ commodityLines: [] }))
    expect(scope.has('commodityLines')).toBe(true)
    expect(scope.has('commodityLines[0].commoditySelection')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The A-side flow shim — the two obligations B does not model, layered onto the
// FULL scope so their owning pages stay reachable; the RAW projection
// excludes them.
// ---------------------------------------------------------------------------

describe('scope bridge — flow-only obligations layered on the full scope', () => {
  it('Should add importType + declaration to the full scope, not the raw projection', () => {
    const full = makeScope(happyPath).inScope
    const raw = rawInScope(happyPath)
    expect(full.has('importType')).toBe(true)
    expect(full.has('declaration')).toBe(true)
    expect(raw.has('importType')).toBe(false)
    expect(raw.has('declaration')).toBe(false)
  })

  it('Should carry the system fields the raw projection owns', () => {
    const raw = rawInScope(happyPath)
    expect(raw.has('poApprovedReferenceNumber')).toBe(true)
    expect(raw.has('responsiblePersonForLoad')).toBe(true)
    expect(raw.has('commodityLines[0].commodityType')).toBe(true)
  })

  it('Should carry the documents collection (D1 resolved at inc-016b)', () => {
    const full = makeScope(happyPath).inScope
    expect(full.has('documents')).toBe(true)
    expect(full.has('documents[0].accompanyingDocumentType')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Shape parity — makeScope returns the scope object the controllers consume.
// ---------------------------------------------------------------------------

describe('scope bridge — makeScope shape parity', () => {
  it('Should expose the same members with the same types', () => {
    const scope = makeScope(happyPath)
    expect(scope.inScope).toBeInstanceOf(Set)
    expect(typeof scope.has).toBe('function')
    expect(typeof scope.answered).toBe('function')
    expect(typeof scope.readyForCheckYourAnswers).toBe('boolean')
  })

  it('Should read the projected inScope set via has(id)', () => {
    const scope = makeScope(happyPath)
    expect(scope.has('countryOfOrigin')).toBe(true)
    expect(scope.has('commodityLines[0].commoditySelection')).toBe(true)
    expect(scope.has('nonExistent')).toBe(false)
  })

  it('Should read whether an obligation instance is answered via answered(id)', () => {
    const scope = makeScope(happyPath)
    expect(scope.answered('countryOfOrigin')).toBe(true)
    expect(scope.answered('commoditySelection')).toBe(true)
    expect(scope.answered('portOfEntry')).toBe(true)
  })
})
