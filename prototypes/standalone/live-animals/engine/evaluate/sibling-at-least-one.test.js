import { describe, expect, it } from 'vitest'
import { entryComplete, collectionComplete } from './complete.js'

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
    expect(
      entryComplete(animalIdentifiers, { permanentAddress: '1 Farm Lane' })
    ).toBe(false)
  })

  it('Should still enforce per-field required fields on top of the group', () => {
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
