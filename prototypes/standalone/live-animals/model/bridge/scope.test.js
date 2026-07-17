import { readFileSync } from 'node:fs'
import { beforeAll, describe, it, expect } from 'vitest'
import { makeScopeFromB } from './scope.js'
import {
  makeScope,
  configureReadyForCheckYourAnswers
} from '../../engine/read.js'

const happyPath = JSON.parse(
  readFileSync(new URL('../../spec/fixtures/happy-path.json', import.meta.url))
).values

// makeScopeFromB defers readyForCheckYourAnswers to A's boot-injected fn
// (via A's makeScope), so the differential needs it configured.
beforeAll(() => configureReadyForCheckYourAnswers(() => false))

const sorted = (set) => [...set].sort()

// A's real inScope vs B's projected inScope, as the two directed
// differences (A-only keys, B-only keys). Empty differences == agreement.
const diff = (answers) => {
  const a = makeScope(answers).inScope
  const b = makeScopeFromB(answers).inScope
  return {
    aOnly: sorted(a).filter((k) => !b.has(k)),
    bOnly: sorted(b).filter((k) => !a.has(k))
  }
}

// ---------------------------------------------------------------------------
// Structural divergences — present in EVERY comparison because one side
// cannot represent the shape the other does (M0 registers, not gate
// behaviour). Filtered out so the behavioural divergences stand alone;
// asserted explicitly in their own block below so they stay documented.
// ---------------------------------------------------------------------------

// B declares two system-populated fields A never models, and a
// commodityType field per line (c-037, drop pending PO sign-off).
const isStructuralBOnly = (k) =>
  k === 'poApprovedReferenceNumber' ||
  k === 'responsiblePersonForLoad' ||
  /^commodityLines\[\d+\]\.commodityType$/.test(k) ||
  // Documents D1: B models the four accompanying-document fields as
  // notification-level singletons; they are always in scope (presentGate
  // is in-scope on both branches).
  /^accompanyingDocument(Type|AttachmentType|Reference|DateOfIssue)$/.test(k)

// A models importType + declaration (A-side flow, not admitted to the
// model) and accompanying documents as a repeatable `documents`
// collection (D1 topology).
const isStructuralAOnly = (k) =>
  k === 'importType' ||
  k === 'declaration' ||
  k === 'documents' ||
  /^documents\[\d+\]\./.test(k)

const behavioural = (answers) => {
  const { aOnly, bOnly } = diff(answers)
  return {
    aOnly: aOnly.filter((k) => !isStructuralAOnly(k)),
    bOnly: bOnly.filter((k) => !isStructuralBOnly(k))
  }
}

// ---------------------------------------------------------------------------
// Constructed states exercising the gates the plan flags.
// ---------------------------------------------------------------------------

// c-017 makes regionOfOriginCode a PERVASIVE behavioural divergence: B
// keeps it in scope unless requirement==='yes', A only when it is 'yes'.
// So every state that leaves the requirement unanswered shows the region
// divergence. Resolve the region axis (requirement='yes') in the gate-
// isolation states so each one tests only its own gate; the region
// divergence gets its own explicit tests below.
const resolveRegion = (answers) => ({
  regionOfOriginCodeRequirement: 'yes',
  regionOfOriginCode: 'FR-75',
  ...answers
})

const regionRequired = resolveRegion({ countryOfOrigin: 'FR' })

const regionNotRequired = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'no',
  regionOfOriginCode: 'FR-75'
}

const regionUnanswered = { countryOfOrigin: 'FR' }

const reasonInternalMarket = resolveRegion({
  reasonForImport: 'internalMarket',
  purposeInInternalMarket: 'breeding'
})

const reasonOther = resolveRegion({ reasonForImport: 'research' })

const transportCommercial = resolveRegion({
  transporterType: 'Commercial',
  meansOfTransport: 'Road Vehicle',
  transitedCountries: ['FR']
})

const transportPrivate = resolveRegion({
  transporterType: 'Private',
  meansOfTransport: 'Aeroplane'
})

const line = (commodity, units) => ({
  commoditySelection: commodity,
  speciesSelection: '1148346',
  numberOfAnimalsQuantity: String(units.length),
  animalIdentifiers: units
})

const multiLineMultiUnit = resolveRegion({
  commodityLines: [
    line('Cow', [
      { animalIdentifierEarTag: 'UK111' },
      { animalIdentifierEarTag: 'UK222' }
    ]),
    line('Horse', [{ horseName: 'Dobbin' }])
  ]
})

const emptyCollection = resolveRegion({ commodityLines: [] })

// ---------------------------------------------------------------------------
// The differential oracle — inScope agreement, modulo documented
// structural divergences.
// ---------------------------------------------------------------------------

describe('scope bridge — A vs B inScope differential (preview of inc-010 oracle)', () => {
  it('agrees on the full happy path (no behavioural divergence)', () => {
    expect(behavioural(happyPath)).toEqual({ aOnly: [], bOnly: [] })
  })

  it('agrees when the region code is required', () => {
    expect(behavioural(regionRequired)).toEqual({ aOnly: [], bOnly: [] })
  })

  // DIVERGENCE (c-017): A gates regionOfOriginCode on requirement==='yes'
  // and wipes it otherwise; B keeps it always-in-scope (optional branch),
  // citing V4 — a claim c-017 struck down. Guaranteed red the plan predicts,
  // and PERVASIVE: it fires in every state where the requirement is not
  // 'yes' (answered 'no' or left unanswered), not just this one.
  it('DIVERGES on regionOfOriginCode when the requirement is answered "no"', () => {
    expect(behavioural(regionNotRequired)).toEqual({
      aOnly: [],
      bOnly: ['regionOfOriginCode']
    })
  })

  it('DIVERGES on regionOfOriginCode when the requirement is unanswered', () => {
    expect(behavioural(regionUnanswered)).toEqual({
      aOnly: [],
      bOnly: ['regionOfOriginCode']
    })
  })

  it('agrees on internal-market purpose gating (in scope)', () => {
    expect(behavioural(reasonInternalMarket)).toEqual({ aOnly: [], bOnly: [] })
  })

  it('agrees on internal-market purpose gating (out of scope)', () => {
    expect(behavioural(reasonOther)).toEqual({ aOnly: [], bOnly: [] })
  })

  it('agrees on the commercial transporter + land-transport branch', () => {
    expect(behavioural(transportCommercial)).toEqual({ aOnly: [], bOnly: [] })
  })

  it('agrees on the private transporter + non-land branch', () => {
    expect(behavioural(transportPrivate)).toEqual({ aOnly: [], bOnly: [] })
  })

  it('agrees across multi-line / multi-unit positional paths', () => {
    expect(behavioural(multiLineMultiUnit)).toEqual({ aOnly: [], bOnly: [] })
  })

  it('agrees on the empty collection (group node in scope, no leaves)', () => {
    const { inScope } = makeScopeFromB(emptyCollection)
    expect(inScope.has('commodityLines')).toBe(true)
    expect(behavioural(emptyCollection)).toEqual({ aOnly: [], bOnly: [] })
  })
})

// ---------------------------------------------------------------------------
// The structural divergences, asserted so they stay visible (M0 registers).
// ---------------------------------------------------------------------------

describe('scope bridge — structural divergences (documented, not gate behaviour)', () => {
  it('B carries two system fields A never models', () => {
    const { bOnly } = diff(happyPath)
    expect(bOnly).toContain('poApprovedReferenceNumber')
    expect(bOnly).toContain('responsiblePersonForLoad')
  })

  it('B carries a commodityType per line (c-037, drop pending PO)', () => {
    const { bOnly } = diff(happyPath)
    expect(bOnly).toContain('commodityLines[0].commodityType')
  })

  it('A models importType + declaration, not admitted to B', () => {
    const { aOnly } = diff(happyPath)
    expect(aOnly).toContain('importType')
    expect(aOnly).toContain('declaration')
  })

  it('documents D1 — A repeatable collection vs B notification-level singletons', () => {
    const { aOnly, bOnly } = diff(happyPath)
    expect(aOnly).toContain('documents')
    expect(aOnly).toContain('documents[0].accompanyingDocumentType')
    expect(bOnly).toContain('accompanyingDocumentType')
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

  it('answered(id) delegates to A answered semantics over A answers', () => {
    const scope = makeScopeFromB(happyPath)
    expect(scope.answered('countryOfOrigin')).toBe(true)
    expect(scope.answered('commoditySelection')).toBe(true)
    expect(scope.answered('portOfEntry')).toBe(true)
  })
})
