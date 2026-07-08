import { describe, expect, it } from 'vitest'
import { entryComplete, collectionComplete } from './complete.js'

/**
 * The inc-032 model-extension: a `requiredOneOf` group mandate on a collection.
 * It names a SUBSET of the entry's sibling fields and requires that at least
 * one of them be answered per entry — the V4 "a notification must be submitted
 * with at least one animal identifier PER ANIMAL" rule, where each identifier
 * field (passport / tattoo / ear tag / ...) is individually OPTIONAL but the
 * group is owed. No live obligation carries it yet — `animalIdentifiers` and
 * its fields are registered by inc-035 — so the mechanics are proven here with
 * synthetic obligations, mirroring nested.test.js / cross-frame.test.js.
 *
 * The identifier fields are same-frame siblings within one unit entry, so this
 * needs no enclosing-frame context (unlike inc-035's completeness threading).
 */

// Mirrors the animalIdentifiers unit collection: six individually-optional
// identifier fields, at least one owed per entry, plus a sibling that is NOT
// part of the identifier group (permanentAddress) to prove the group is a
// named subset, not "any sibling".
const idGroup = [
  'animalIdentifierPassport',
  'animalIdentifierTattoo',
  'animalIdentifierEarTag',
  'horseName',
  'animalIdentifierIdentificationDetails',
  'animalIdentifierDescription'
]

const animalIdentifiers = {
  id: 'animalIdentifiers',
  collection: true,
  item: [
    { id: 'animalIdentifierPassport' },
    { id: 'animalIdentifierTattoo' },
    { id: 'animalIdentifierEarTag' },
    { id: 'horseName' },
    { id: 'animalIdentifierIdentificationDetails' },
    { id: 'animalIdentifierDescription' },
    { id: 'permanentAddress' }
  ],
  requiredAtLeastOne: true,
  requiredOneOf: idGroup
}

describe('requiredOneOf group mandate (synthetic — no live carrier)', () => {
  it('Should treat an entry with ZERO of the group answered as incomplete', () => {
    expect(entryComplete(animalIdentifiers, {})).toBe(false)
    // Blank strings and empty arrays are not answers.
    expect(
      entryComplete(animalIdentifiers, {
        animalIdentifierPassport: '',
        horseName: '   '
      })
    ).toBe(false)
  })

  it('Should treat an entry with EXACTLY ONE of the group answered as complete', () => {
    expect(
      entryComplete(animalIdentifiers, { animalIdentifierEarTag: 'UK123456' })
    ).toBe(true)
  })

  it('Should stay complete as more of the group is answered', () => {
    expect(
      entryComplete(animalIdentifiers, {
        animalIdentifierEarTag: 'UK123456',
        animalIdentifierPassport: 'P-1'
      })
    ).toBe(true)
    expect(
      entryComplete(animalIdentifiers, {
        animalIdentifierPassport: 'P-1',
        animalIdentifierTattoo: 'T-1',
        animalIdentifierEarTag: 'UK123456',
        horseName: 'Dobbin',
        animalIdentifierIdentificationDetails: 'details',
        animalIdentifierDescription: 'a brown horse'
      })
    ).toBe(true)
  })

  it('Should NOT count a sibling outside the named group towards the mandate', () => {
    // permanentAddress is a sibling item but not in requiredOneOf, so answering
    // it alone leaves the identifier group unsatisfied.
    expect(
      entryComplete(animalIdentifiers, { permanentAddress: '1 Farm Lane' })
    ).toBe(false)
  })

  it('Should still enforce per-field required fields on top of the group', () => {
    // The group check is additive, not a replacement: a required sibling left
    // blank keeps the entry incomplete even when the group is satisfied.
    const withRequiredSibling = {
      ...animalIdentifiers,
      item: [...animalIdentifiers.item, { id: 'unitCount', required: true }]
    }
    expect(
      entryComplete(withRequiredSibling, { animalIdentifierEarTag: 'UK123456' })
    ).toBe(false)
    expect(
      entryComplete(withRequiredSibling, {
        animalIdentifierEarTag: 'UK123456',
        unitCount: '3'
      })
    ).toBe(true)
  })

  it('Should fail the whole collection when any one entry misses the group', () => {
    expect(
      collectionComplete(animalIdentifiers, [
        { animalIdentifierEarTag: 'UK1' },
        { permanentAddress: '1 Farm Lane' }
      ])
    ).toBe(false)
    expect(
      collectionComplete(animalIdentifiers, [
        { animalIdentifierEarTag: 'UK1' },
        { animalIdentifierPassport: 'P-2' }
      ])
    ).toBe(true)
  })

  it('Should apply the group per entry at depth-2 (nested requiredOneOf)', () => {
    // A nested collection carrying its own requiredOneOf is resolved through
    // collectionComplete -> entryComplete recursion; each level consults its
    // own obligation.requiredOneOf, so the mandate holds two frames in.
    const line = {
      id: 'commodityLines',
      item: [animalIdentifiers],
      requiredAtLeastOne: true
    }
    expect(
      entryComplete(line, {
        animalIdentifiers: [{ permanentAddress: '1 Farm Lane' }]
      })
    ).toBe(false)
    expect(
      entryComplete(line, {
        animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
      })
    ).toBe(true)
  })
})

describe('requiredOneOf backwards compatibility', () => {
  it('Should behave exactly as today for a collection WITHOUT the marker', () => {
    // No requiredOneOf: an entry of all-optional fields is complete even when
    // every field is blank (pre-inc-032 behaviour), and a blank REQUIRED field
    // still fails.
    const noMarker = {
      id: 'commodityLines',
      collection: true,
      item: [{ id: 'a' }, { id: 'b' }],
      requiredAtLeastOne: true
    }
    expect(entryComplete(noMarker, {})).toBe(true)
    expect(collectionComplete(noMarker, [{}])).toBe(true)

    const requiredField = {
      id: 'commodityLines',
      collection: true,
      item: [{ id: 'a', required: true }],
      requiredAtLeastOne: true
    }
    expect(entryComplete(requiredField, {})).toBe(false)
    expect(entryComplete(requiredField, { a: 'ok' })).toBe(true)
  })
})
