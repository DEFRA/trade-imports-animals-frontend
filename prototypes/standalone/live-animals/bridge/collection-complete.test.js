import { describe, expect, it } from 'vitest'
import { collectionView } from '../engine/evaluate/collection-view.js'
import { collectionCapAt } from '../engine/evaluate/cardinality.js'
import { entryComplete } from './collection-complete.js'
import { valueAt } from '../lib/path.js'

// Per-instance completeness (entryComplete), pinned against the manifest. The
// two known structural divergences are pinned here so a regression fails
// loudly.

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
  commodityType: '16',
  numberOfAnimalsQuantity: '1',
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

describe('#entryComplete', () => {
  it('Should read a multi-line state — full / partial / empty', () => {
    const answers = { commodityLines: [completeLine, partialLine, emptyLine] }
    expect(completeFlags(answers, ['commodityLines'])).toEqual([
      true,
      false,
      false
    ])
  })

  it('Should read a multi-unit state — full unit complete', () => {
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

  it('Should keep entries / index / path in positional storage', () => {
    const answers = { commodityLines: [completeLine, emptyLine] }
    const view = collectionView(answers, ['commodityLines'])
    expect(
      view.map((r) => ({ index: r.index, path: r.path, entry: r.entry }))
    ).toEqual([
      { index: 0, path: ['commodityLines', 0], entry: completeLine },
      { index: 1, path: ['commodityLines', 1], entry: emptyLine }
    ])
    // entry is the SAME reference the store held, unchanged by the evaluator.
    expect(view[0].entry).toBe(completeLine)
  })

  // Two known structural divergences, pinned (not repaired). The evaluator
  // scopes each concern precisely, so these read complete; a future change that
  // flips them fails loudly.

  it('Should read a Cow unit without permanentAddress as complete (scoped to 01061900)', () => {
    const answers = {
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: ['1148346'],
          commodityType: '16',
          numberOfAnimalsQuantity: '1',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        }
      ]
    }
    expect(completeFlags(answers, ['commodityLines'])).toEqual([true])
  })

  it('Should read a fully-empty nested unit as complete (never enumerated)', () => {
    // The evaluator infers instances from leaf composite prefixes; a unit with
    // no stored leaf is never enumerated, so its unmet at-least-one rule cannot
    // fire.
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

  it('Should treat an upload-only document as started but incomplete', () => {
    const answers = {
      documents: [{ uploadId: 'upload-001', filename: 'itahc-certificate.pdf' }]
    }
    expect(completeFlags(answers, ['documents'])).toEqual([false])
  })

  it('Should not let optional upload fields block a complete document', () => {
    const completeDocument = {
      accompanyingDocumentType: 'ITAHC',
      accompanyingDocumentAttachmentType: 'PDF',
      accompanyingDocumentReference: 'GBHC1234567890',
      accompanyingDocumentDateOfIssue: {
        day: '12',
        month: '12',
        year: '2025'
      }
    }
    const answers = {
      documents: [
        completeDocument,
        {
          ...completeDocument,
          uploadId: 'upload-001',
          filename: 'itahc-certificate.pdf'
        }
      ]
    }
    expect(completeFlags(answers, ['documents'])).toEqual([true, true])
  })
})

describe('collectionCapAt reads from positional storage (maxEntriesFrom)', () => {
  it('returns the positional cardinality', () => {
    const answers = {
      commodityLines: [
        { numberOfAnimalsQuantity: '3', animalIdentifiers: [{}, {}] }
      ]
    }
    const path = ['commodityLines', 0, 'animalIdentifiers']
    expect(collectionCapAt(answers, path)).toBe(3)
  })
})
