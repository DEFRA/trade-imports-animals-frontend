import { describe, expect, it } from 'vitest'
import { collectionView } from '../../engine/evaluate/collection-view.js'
import { collectionCapAt } from '../../engine/evaluate/cardinality.js'
import { entryComplete } from './collection-complete.js'
import { valueAt } from '../../lib/path.js'

// Per-instance completeness (entryComplete), pinned against the manifest. The
// two known structural divergences are retained with their DESIGN-DELTA.md §12
// rationale so a regression fails loudly.

const address = {
  name: 'Owner',
  addressLine1: '1 Farm Lane',
  town: 'Yorkton',
  postcode: 'YO1 1AA',
  country: 'United Kingdom',
  telephone: '01000 000000',
  email: 'owner@example.test'
}

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

const completeFlags = (answers, collectionPath) => {
  const entries = valueAt(answers, collectionPath) ?? []
  return entries.map((_entry, index) =>
    entryComplete(answers, collectionPath, index)
  )
}

describe('collectionView `complete` — per-instance completeness', () => {
  it('reads a multi-line state — full / partial / empty', () => {
    const answers = { commodityLines: [completeLine, partialLine, emptyLine] }
    expect(completeFlags(answers, ['commodityLines'])).toEqual([
      true,
      false,
      false
    ])
  })

  it('reads a multi-unit state — full unit complete', () => {
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
    expect(completeFlags(answers, path)).toEqual([true, true])
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
    // entry is the SAME reference the store held, unchanged by the B path.
    expect(view[0].entry).toBe(completeLine)
  })

  // Behaviour retained from the oracle's "known divergence" pins (finds, NOT
  // repaired). B scopes each concern precisely, so these read complete; a future
  // change that flips them fails loudly. See DESIGN-DELTA.md §12.

  it('Cow unit without permanentAddress — B reads complete (scoped to 01061900)', () => {
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
    expect(completeFlags(answers, ['commodityLines'])).toEqual([true])
  })

  it('a fully-empty nested unit vanishes from B — B reads complete', () => {
    // B infers instances from leaf composite prefixes; a unit with no stored
    // leaf is never enumerated, so B cannot flag its unmet at-least-one rule.
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
    expect(completeFlags(answers, path)).toEqual([true])
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
