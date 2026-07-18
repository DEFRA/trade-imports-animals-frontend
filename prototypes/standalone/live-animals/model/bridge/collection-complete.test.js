import { describe, expect, it } from 'vitest'
import { collectionView } from '../../engine/evaluate/collection-view.js'
import { collectionCapAt } from '../../engine/evaluate/cardinality.js'
import { entryComplete } from '../../engine/evaluate/complete.js'
import { entryCompleteFromB } from './collection-complete.js'
import { registry } from '../../registry.js'
import { valueAt } from '../../lib/path.js'

// A complete address in the flat sub-field shape B's `isComplete` accepts
// (name / addressLine1 / town / postcode / country / telephone / email); A's
// `isAnswered` treats any non-blank object as present, so both engines agree.
const address = {
  name: 'Owner',
  addressLine1: '1 Farm Lane',
  town: 'Yorkton',
  postcode: 'YO1 1AA',
  country: 'United Kingdom',
  telephone: '01000 000000',
  email: 'owner@example.test'
}

// Cow (0102): earTag satisfies the at-least-one identifier rule on both
// sides; permanentAddress is out of B's scope (01061900 only) but present,
// so A's ctx-less collectionView (which treats it as always-required) is
// satisfied too. Agreement point.
const completeLine = {
  commoditySelection: 'Cow',
  speciesSelection: ['1148346'],
  numberOfAnimalsQuantity: '25',
  animalIdentifiers: [
    { animalIdentifierEarTag: 'UK123456789012', permanentAddress: address }
  ]
}

const partialLine = { commoditySelection: 'Cow' }

const emptyLine = {}

// A's completeness via `entryComplete` (ctx-less), B's via `entryCompleteFromB`
// — the two authorities `collectionView`'s `completeAt` used to select between,
// now compared directly at the model level (no flag).
const completeAtBothModels = (answers, collectionPath) => {
  const templatePath = collectionPath
    .filter((segment) => typeof segment === 'string')
    .join('.')
  const obligation = registry.byPath(templatePath)
  const entries = valueAt(answers, collectionPath) ?? []
  const underA = entries.map((entry) =>
    obligation ? entryComplete(obligation, entry) : true
  )
  const underB = entries.map((entry, index) =>
    obligation ? entryCompleteFromB(answers, collectionPath, index) : true
  )
  return { underA, underB }
}

describe('collectionView `complete` — A vs B agreement (inc-014)', () => {
  it('agrees A vs B across a multi-line state — full / partial / empty', () => {
    const answers = { commodityLines: [completeLine, partialLine, emptyLine] }
    const { underA, underB } = completeAtBothModels(answers, ['commodityLines'])
    expect(underA).toEqual([true, false, false])
    expect(underB).toEqual(underA)
  })

  it('agrees A vs B across a multi-unit state — full unit complete', () => {
    const answers = {
      commodityLines: [
        {
          commoditySelection: 'Cat',
          speciesSelection: ['923501'],
          numberOfAnimalsQuantity: '2',
          animalIdentifiers: [
            { animalIdentifierPassport: 'P-1', permanentAddress: address },
            { animalIdentifierPassport: 'P-2', permanentAddress: address }
          ]
        }
      ]
    }
    const path = ['commodityLines', 0, 'animalIdentifiers']
    const { underA, underB } = completeAtBothModels(answers, path)
    expect(underA).toEqual([true, true])
    expect(underB).toEqual(underA)
  })

  it('entries / index / path stay A-side (positional storage)', () => {
    const answers = { commodityLines: [completeLine, emptyLine] }
    const view = collectionView(answers, ['commodityLines'])
    expect(
      view.map((r) => ({ index: r.index, path: r.path, entry: r.entry }))
    ).toEqual([
      { index: 0, path: ['commodityLines', 0], entry: completeLine },
      { index: 1, path: ['commodityLines', 1], entry: emptyLine }
    ])
    // entry is the SAME reference A stored, unchanged by the B path.
    expect(view[0].entry).toBe(completeLine)
  })

  // KNOWN DIVERGENCES (finds — NOT repaired). Captured so a future change
  // that closes them fails loudly. See DESIGN-DELTA.md §12.

  it('divergence: Cow unit without permanentAddress — A incomplete (ctx-less), B complete', () => {
    // A's collectionView calls entryComplete with no ctx, so permanentAddress
    // (required, enclosing-gated) is treated as mandatory for EVERY unit
    // regardless of commodity. B scopes it to 01061900 only, so a Cow line
    // with an identifier but no permanentAddress (the happy-path shape) reads
    // complete under B, incomplete under A.
    const answers = {
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: ['1148346'],
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        }
      ]
    }
    const { underA, underB } = completeAtBothModels(answers, ['commodityLines'])
    expect(underA).toEqual([false])
    expect(underB).toEqual([true])
  })

  it('divergence: a fully-empty nested unit vanishes from B — A incomplete, B complete', () => {
    // B infers instances from leaf composite prefixes; a unit with no stored
    // leaf is never enumerated, so B cannot flag its unmet at-least-one rule.
    // A, reading its own array, still shows the entry and marks it incomplete.
    const answers = {
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: ['1148346'],
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{}]
        }
      ]
    }
    const path = ['commodityLines', 0, 'animalIdentifiers']
    const { underA, underB } = completeAtBothModels(answers, path)
    expect(underA).toEqual([false])
    expect(underB).toEqual([true])
  })
})

describe('collectionCapAt stays A-side (maxEntriesFrom, inc-024a)', () => {
  it('returns A cardinality', () => {
    const answers = {
      commodityLines: [
        { numberOfAnimalsQuantity: '3', animalIdentifiers: [{}, {}] }
      ]
    }
    const path = ['commodityLines', 0, 'animalIdentifiers']
    expect(collectionCapAt(answers, path)).toBe(3)
  })
})
