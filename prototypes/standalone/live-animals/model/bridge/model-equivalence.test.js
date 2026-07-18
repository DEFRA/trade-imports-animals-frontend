import { readFileSync } from 'node:fs'
import { describe, it, expect, beforeAll } from 'vitest'
import {
  makeScope,
  configureReadyForCheckYourAnswers
} from '../../engine/read.js'
import { makeScopeFromB } from './scope.js'
import { reconcile } from '../../engine/evaluate/reconcile.js'
import { obligations } from '../obligations/obligations.js'
import { createObligationEvaluator } from '../obligations/evaluator.js'
import {
  answersToFulfilments,
  ancestorChain,
  fulfilmentIdToPath,
  groupObligations
} from './fulfilments.js'
import { pathKey, parsePath } from '../../lib/path.js'
import { isAnswered } from '../../lib/answered.js'
import { walkObligations } from '../../registry.js'
import {
  enumerateScopeStates,
  submitReadySeed
} from '../../analysis/reachability.js'

const happyPath = JSON.parse(
  readFileSync(new URL('../../spec/fixtures/happy-path.json', import.meta.url))
).values

beforeAll(() => configureReadyForCheckYourAnswers(() => false))

const evaluator = createObligationEvaluator()
const evaluate = (answers) => evaluator.evaluate(answersToFulfilments(answers))

// ---------------------------------------------------------------------------
// Structural divergences (inc-009 taxonomy, verbatim). A shape one side
// cannot represent — the M0 registers, not gate behaviour. Filtered out of
// every axis so the behavioural divergences stand alone.
// ---------------------------------------------------------------------------

const isStructuralBOnly = (k) =>
  k === 'poApprovedReferenceNumber' ||
  k === 'responsiblePersonForLoad' ||
  /^commodityLines\[\d+\]\.commodityType$/.test(k) ||
  /^accompanyingDocument(Type|AttachmentType|Reference|DateOfIssue)$/.test(k)

const isStructuralAOnly = (k) =>
  k === 'importType' ||
  k === 'declaration' ||
  k === 'documents' ||
  /^documents\[\d+\]\./.test(k)

// ---------------------------------------------------------------------------
// Axis 1 — inScope (inc-009, widened input space).
// ---------------------------------------------------------------------------

const scopeDivergence = (answers) => {
  const a = makeScope(answers).inScope
  const b = makeScopeFromB(answers).inScope
  return {
    aOnly: [...a]
      .filter((k) => !b.has(k))
      .filter((k) => !isStructuralAOnly(k))
      .sort(),
    bOnly: [...b]
      .filter((k) => !a.has(k))
      .filter((k) => !isStructuralBOnly(k))
      .sort()
  }
}

// ---------------------------------------------------------------------------
// Axis 2 — status (mandate). Mandate is static on both sides (inc-003 §6),
// so this is a scalar mandatory/optional per obligation, only meaningful
// where the obligation is in scope on BOTH engines. Groups carry no mandate
// (they enforce cardinality, not fill) and are skipped.
// ---------------------------------------------------------------------------

const obligationByAId = new Map(
  [...walkObligations()].map((n) => [n.obligation.id, n.obligation])
)
const mandateA = (aId) =>
  obligationByAId.get(aId)?.required ? 'mandatory' : 'optional'
const mandateB = (impl) =>
  impl.status ?? impl.records?.[0]?.status ?? 'mandatory'

const leafAId = (key) =>
  parsePath(key)
    .filter((s) => typeof s === 'string')
    .at(-1)

const statusDivergence = (answers) => {
  const state = evaluate(answers)
  const aInScopeIds = new Set([...reconcile(answers).inScope].map(leafAId))
  const out = []
  for (const o of obligations) {
    if (groupObligations.has(o)) continue
    const impl = state.obligations[o.id]
    if (impl?.inScope !== true) continue
    if (!aInScopeIds.has(o.name)) continue
    const a = mandateA(o.name)
    const b = mandateB(impl)
    if (a !== b) out.push(`${o.name}: A=${a} B=${b}`)
  }
  return out.sort()
}

// ---------------------------------------------------------------------------
// Axis 3 — wipe. A gate flips a stored value out of scope: does each engine
// DESTROY it? A's reconcile returns a `wiped` set of pathKeys. B's evaluate
// purges out-of-scope fulfilments — diff input vs output fulfilments and
// project the destroyed entries back into A's pathKey grammar. aOnly = A
// destroys / B retains; bOnly = B destroys / A retains.
// ---------------------------------------------------------------------------

const wipedByA = (answers) => new Set(reconcile(answers).wiped)

const wipedByB = (answers) => {
  const fIn = answersToFulfilments(answers)
  const { fulfilments: fOut } = evaluator.evaluate(fIn)
  const wiped = new Set()
  for (const o of obligations) {
    if (groupObligations.has(o)) continue
    const inVal = fIn[o.id]
    if (inVal === undefined) continue
    const chain = ancestorChain(o)
    if (chain.length === 0) {
      if (isAnswered(inVal) && fOut[o.id] === undefined) {
        wiped.add(pathKey([o.name]))
      }
      continue
    }
    const outRecords = fOut[o.id] ?? {}
    for (const [fulfilmentId, value] of Object.entries(inVal)) {
      if (isAnswered(value) && outRecords[fulfilmentId] === undefined) {
        wiped.add(pathKey(fulfilmentIdToPath(chain, fulfilmentId, o.name)))
      }
    }
  }
  return wiped
}

const wipeDivergence = (answers) => {
  const a = wipedByA(answers)
  const b = wipedByB(answers)
  return {
    aOnly: [...a]
      .filter((k) => !b.has(k))
      .filter((k) => !isStructuralAOnly(k))
      .sort(),
    bOnly: [...b]
      .filter((k) => !a.has(k))
      .filter((k) => !isStructuralBOnly(k))
      .sort()
  }
}

// ---------------------------------------------------------------------------
// Input space — systematic, not hand-picked. reachability's 24-state gate
// grid over a fully-populated seed (blanks toggle gates OFF against stored
// values — a natural wipe probe), plus happy-path + the seed itself, plus
// inc-009's constructed edge states and dedicated wipe probes.
// ---------------------------------------------------------------------------

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

const gridStates = enumerateScopeStates().map((state, i) => ({
  name: `grid-${i}`,
  answers: { ...submitReadySeed, ...state }
}))

// Region required — the requirement is 'yes', so A and B agree on scope.
const regionRequired = resolveRegion({ countryOfOrigin: 'FR' })
// Region NOT required with a stored value — the c-017 case, on scope AND wipe.
const regionNotRequired = {
  countryOfOrigin: 'FR',
  regionOfOriginCodeRequirement: 'no',
  regionOfOriginCode: 'FR-75'
}
const regionUnanswered = { countryOfOrigin: 'FR' }
// Land transport — transitedCountries is in scope, so the c-038 mandate
// divergence fires on the status axis.
const transportLand = resolveRegion({
  transporterType: 'Commercial',
  meansOfTransport: 'Road Vehicle',
  transitedCountries: ['FR']
})
const transportPrivate = resolveRegion({
  transporterType: 'Private',
  meansOfTransport: 'Aeroplane'
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
// A non-region gated value present with its gate OFF — both engines destroy
// it (the control that proves the wipe axis is not a no-op).
const wipePurpose = resolveRegion({
  reasonForImport: 'research',
  purposeInInternalMarket: 'breeding'
})
const wipeTransit = resolveRegion({
  transporterType: 'Private',
  meansOfTransport: 'Aeroplane',
  transitedCountries: ['FR']
})
const wipeCommercialTransporter = resolveRegion({
  transporterType: 'Private',
  commercialTransporter: {
    name: 'X',
    address: { addressLine1: '1', country: 'Ireland' }
  }
})

const inputSpace = [
  { name: 'happy-path', answers: happyPath },
  { name: 'submitReadySeed', answers: submitReadySeed },
  ...gridStates,
  { name: 'regionRequired', answers: regionRequired },
  { name: 'regionNotRequired', answers: regionNotRequired },
  { name: 'regionUnanswered', answers: regionUnanswered },
  { name: 'transportLand', answers: transportLand },
  { name: 'transportPrivate', answers: transportPrivate },
  { name: 'multiLineMultiUnit', answers: multiLineMultiUnit },
  { name: 'emptyCollection', answers: emptyCollection },
  { name: 'wipePurpose', answers: wipePurpose },
  { name: 'wipeTransit', answers: wipeTransit },
  { name: 'wipeCommercialTransporter', answers: wipeCommercialTransporter }
]

// ---------------------------------------------------------------------------
// The divergence register — the KNOWN behavioural divergence set. Every
// entry is ruled in spec/conflicts.json (NOT open), and every one resolves
// "fix B" at cutover. A NEW divergence outside this set breaks the sweep and
// demands attention — divergences are FINDS, asserted so they stay visible,
// never forced equal.
// ---------------------------------------------------------------------------

// scope: B keeps regionOfOriginCode in scope when requirement !== 'yes'; A
// gates it on 'yes'. Ruled c-017 (B's retained regionCode "are not
// requirements") → fix B: gate the no/unset branch inScope:false.
const KNOWN_SCOPE_BONLY = new Set(['regionOfOriginCode'])
// status: A marks transitedCountries mandatory, B optional. Ruled c-038
// (REQUIRED when land transport) → fix B: whenTrue status 'mandatory'.
const KNOWN_STATUS = new Set(['transitedCountries: A=mandatory B=optional'])
// wipe: A destroys a stored regionOfOriginCode when it leaves scope; B
// retains it (same c-017 root, DATA axis) → fix B (falls out of the scope fix).
const KNOWN_WIPE_AONLY = new Set(['regionOfOriginCode'])

describe('model-equivalence oracle — inScope axis (inc-009, widened)', () => {
  it('agrees on the happy path and region-required (no behavioural divergence)', () => {
    expect(scopeDivergence(happyPath)).toEqual({ aOnly: [], bOnly: [] })
    expect(scopeDivergence(regionRequired)).toEqual({ aOnly: [], bOnly: [] })
  })

  it('DIVERGES on regionOfOriginCode whenever the requirement is not "yes" (c-017)', () => {
    expect(scopeDivergence(regionNotRequired)).toEqual({
      aOnly: [],
      bOnly: ['regionOfOriginCode']
    })
    expect(scopeDivergence(regionUnanswered)).toEqual({
      aOnly: [],
      bOnly: ['regionOfOriginCode']
    })
  })

  it('agrees across multi-line / multi-unit and the empty collection', () => {
    expect(scopeDivergence(multiLineMultiUnit)).toEqual({
      aOnly: [],
      bOnly: []
    })
    expect(scopeDivergence(emptyCollection)).toEqual({ aOnly: [], bOnly: [] })
  })
})

describe('model-equivalence oracle — status (mandate) axis', () => {
  it('DIVERGES on transitedCountries mandate under land transport (c-038)', () => {
    expect(statusDivergence(transportLand)).toEqual([
      'transitedCountries: A=mandatory B=optional'
    ])
  })

  it('agrees on mandate everywhere transitedCountries is out of scope', () => {
    expect(statusDivergence(transportPrivate)).toEqual([])
    expect(statusDivergence(regionRequired)).toEqual([])
  })
})

describe('model-equivalence oracle — wipe (data-destruction) axis', () => {
  it('DIVERGES on regionOfOriginCode — A destroys, B retains (c-017, data axis)', () => {
    expect(wipeDivergence(regionNotRequired)).toEqual({
      aOnly: ['regionOfOriginCode'],
      bOnly: []
    })
    // A really does destroy it — the divergence is "A wipes / B keeps", not a no-op.
    expect([...wipedByA(regionNotRequired)]).toContain('regionOfOriginCode')
  })

  it('agrees when a NON-region gated value flips out of scope — both destroy it', () => {
    expect(wipeDivergence(wipePurpose)).toEqual({ aOnly: [], bOnly: [] })
    expect([...wipedByA(wipePurpose)]).toContain('purposeInInternalMarket')
    expect(wipeDivergence(wipeTransit)).toEqual({ aOnly: [], bOnly: [] })
    expect([...wipedByA(wipeTransit)]).toContain('transitedCountries')
    expect(wipeDivergence(wipeCommercialTransporter)).toEqual({
      aOnly: [],
      bOnly: []
    })
    expect([...wipedByA(wipeCommercialTransporter)]).toContain(
      'commercialTransporter'
    )
  })
})

describe('model-equivalence oracle — the divergence register (full sweep)', () => {
  it('the ONLY behavioural divergences across the whole input space are the known, ruled ones', () => {
    for (const { name, answers } of inputSpace) {
      const s = scopeDivergence(answers)
      const st = statusDivergence(answers)
      const w = wipeDivergence(answers)
      // A never over-scopes, and B never over-wipes: those directions are clean.
      expect(s.aOnly, `unexpected scope aOnly @ ${name}`).toEqual([])
      expect(w.bOnly, `unexpected wipe bOnly @ ${name}`).toEqual([])
      for (const k of s.bOnly) {
        expect(
          KNOWN_SCOPE_BONLY.has(k),
          `NEW scope divergence ${k} @ ${name}`
        ).toBe(true)
      }
      for (const k of st) {
        expect(
          KNOWN_STATUS.has(k),
          `NEW status divergence ${k} @ ${name}`
        ).toBe(true)
      }
      for (const k of w.aOnly) {
        expect(
          KNOWN_WIPE_AONLY.has(k),
          `NEW wipe divergence ${k} @ ${name}`
        ).toBe(true)
      }
    }
  })

  it('spans a broad, systematic input space', () => {
    // 24-state gate grid + happy-path + seed + 11 constructed edge/probe states.
    expect(gridStates).toHaveLength(24)
    expect(inputSpace.length).toBeGreaterThanOrEqual(35)
  })
})

// ---------------------------------------------------------------------------
// The structural blind spots (M0 registers). The oracle compares two engines
// over the SAME inputs, so it cannot see a shape one side is incapable of
// representing. Asserted here from the raw (unfiltered) scope diff so they
// stay documented — M2-green does NOT mean behaviourally complete. See
// retrofit/{DELTA-REGISTER,SEMANTICS}.md and DIVERGENCE-REGISTER.md §"blind".
// ---------------------------------------------------------------------------

const rawScope = (answers) => {
  const a = makeScope(answers).inScope
  const b = makeScopeFromB(answers).inScope
  return {
    aOnly: [...a].filter((k) => !b.has(k)),
    bOnly: [...b].filter((k) => !a.has(k))
  }
}

describe('model-equivalence oracle — structural deltas the oracle is BLIND to', () => {
  it('B-only: system fields + per-line commodityType (D6/D9, not gate behaviour)', () => {
    const { bOnly } = rawScope(happyPath)
    expect(bOnly).toContain('poApprovedReferenceNumber')
    expect(bOnly).toContain('responsiblePersonForLoad')
    expect(bOnly).toContain('commodityLines[0].commodityType')
  })

  it('A-only: importType + declaration (D7/D8, A-side flow, not admitted to B)', () => {
    const { aOnly } = rawScope(happyPath)
    expect(aOnly).toContain('importType')
    expect(aOnly).toContain('declaration')
  })

  it('documents D1 — A repeatable collection vs B notification-level singletons', () => {
    const { aOnly, bOnly } = rawScope(happyPath)
    expect(aOnly).toContain('documents')
    expect(aOnly).toContain('documents[0].accompanyingDocumentType')
    expect(bOnly).toContain('accompanyingDocumentType')
  })
})
