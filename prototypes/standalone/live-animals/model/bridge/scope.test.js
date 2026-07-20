import { readFileSync } from 'node:fs'
import { beforeAll, describe, it, expect } from 'vitest'
import { makeScopeFromB, rawInScopeFromB } from './scope.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'

// B's scope projection, pinned directly against B (the A-vs-B oracle that this
// file used to host — makeScopeA diffed against rawInScopeFromB — retired at
// inc-023 with zero behavioural divergence; see retrofit/DIVERGENCE-REGISTER.md).
// These assertions re-express the oracle's agreement points as B-only facts:
// each gate scopes its obligation in/out as the manifest declares, positional
// keys project under multi-line/multi-unit answers, and makeScopeFromB stays a
// shape-identical drop-in for the runtime makeScope.

const happyPath = JSON.parse(
  readFileSync(new URL('../../spec/fixtures/happy-path.json', import.meta.url))
).values

// makeScopeFromB computes readyForCheckYourAnswers via the boot-injected fn.
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
  it('keeps regionOfOriginCode in scope only when the requirement is "yes"', () => {
    expect(
      makeScopeFromB(resolveRegion({ countryOfOrigin: 'FR' })).has(
        'regionOfOriginCode'
      )
    ).toBe(true)
    expect(
      makeScopeFromB({
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        regionOfOriginCode: 'FR-75'
      }).has('regionOfOriginCode')
    ).toBe(false)
    // Unanswered requirement — out of scope (c-017).
    expect(
      makeScopeFromB({ countryOfOrigin: 'FR' }).has('regionOfOriginCode')
    ).toBe(false)
  })

  it('scopes purposeInInternalMarket only under the internal-market reason', () => {
    expect(
      makeScopeFromB(
        resolveRegion({
          reasonForImport: 'internalMarket',
          purposeInInternalMarket: 'breeding'
        })
      ).has('purposeInInternalMarket')
    ).toBe(true)
    expect(
      makeScopeFromB(resolveRegion({ reasonForImport: 'research' })).has(
        'purposeInInternalMarket'
      )
    ).toBe(false)
  })

  it('scopes the commercial transporter + land-transit branch', () => {
    const scope = makeScopeFromB(
      resolveRegion({
        transporterType: 'Commercial',
        meansOfTransport: 'Road Vehicle',
        transitedCountries: ['FR']
      })
    )
    expect(scope.has('commercialTransporter')).toBe(true)
    expect(scope.has('transitedCountries')).toBe(true)
  })

  it('scopes the private transporter + non-land branch', () => {
    const scope = makeScopeFromB(
      resolveRegion({
        transporterType: 'Private',
        meansOfTransport: 'Aeroplane'
      })
    )
    expect(scope.has('privateTransporter')).toBe(true)
    expect(scope.has('transitedCountries')).toBe(false)
  })

  it('projects positional keys across multi-line / multi-unit answers', () => {
    const scope = makeScopeFromB(
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

  it('keeps the group node in scope for an empty required collection', () => {
    const scope = makeScopeFromB(resolveRegion({ commodityLines: [] }))
    expect(scope.has('commodityLines')).toBe(true)
    expect(scope.has('commodityLines[0].commoditySelection')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The A-side flow shim — the two obligations B does not model, layered onto the
// FULL scope (inc-018) so their owning pages stay reachable under B; the RAW
// projection excludes them. These were the oracle's "structural A-only" axis.
// ---------------------------------------------------------------------------

describe('scope bridge — A-only flow obligations layered on the full scope', () => {
  it('adds importType + declaration to the full scope, not the raw projection', () => {
    const full = makeScopeFromB(happyPath).inScope
    const raw = rawInScopeFromB(happyPath)
    expect(full.has('importType')).toBe(true)
    expect(full.has('declaration')).toBe(true)
    expect(raw.has('importType')).toBe(false)
    expect(raw.has('declaration')).toBe(false)
  })

  it('carries B system fields the raw projection owns', () => {
    const raw = rawInScopeFromB(happyPath)
    expect(raw.has('poApprovedReferenceNumber')).toBe(true)
    expect(raw.has('responsiblePersonForLoad')).toBe(true)
    expect(raw.has('commodityLines[0].commodityType')).toBe(true)
  })

  it('carries the documents collection (D1 resolved at inc-016b)', () => {
    const full = makeScopeFromB(happyPath).inScope
    expect(full.has('documents')).toBe(true)
    expect(full.has('documents[0].accompanyingDocumentType')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Shape parity — makeScopeFromB is a drop-in for makeScope.
// ---------------------------------------------------------------------------

describe('scope bridge — makeScopeFromB shape parity with makeScope', () => {
  it('exposes the same members with the same types', () => {
    const scope = makeScopeFromB(happyPath)
    expect(scope.inScope).toBeInstanceOf(Set)
    expect(typeof scope.has).toBe('function')
    expect(typeof scope.answered).toBe('function')
    expect(typeof scope.readyForCheckYourAnswers).toBe('boolean')
  })

  it('has(id) reads the projected inScope set', () => {
    const scope = makeScopeFromB(happyPath)
    expect(scope.has('countryOfOrigin')).toBe(true)
    expect(scope.has('commodityLines[0].commoditySelection')).toBe(true)
    expect(scope.has('nonExistent')).toBe(false)
  })

  it('answered(id) reads whether an obligation instance is answered', () => {
    const scope = makeScopeFromB(happyPath)
    expect(scope.answered('countryOfOrigin')).toBe(true)
    expect(scope.answered('commoditySelection')).toBe(true)
    expect(scope.answered('portOfEntry')).toBe(true)
  })
})
