import { describe, expect, it } from 'vitest'
import { collectionView } from './collection-view.js'

const address = { name: 'Owner', address: { addressLine1: '1 Farm Lane' } }

const completeLine = {
  commoditySelection: '0102 - Cattle',
  typeSelection: 'domestic',
  speciesSelection: ['bos-taurus'],
  numberOfAnimalsQuantity: '25',
  animalIdentifiers: [
    { animalIdentifierEarTag: 'UK123456789012', permanentAddress: address }
  ]
}

const incompleteLine = { commoditySelection: '0102 - Cattle' }

describe('#collectionView', () => {
  it('Should map each stored entry to {index, path, entry} in order', () => {
    const answers = { commodityLines: [completeLine, incompleteLine] }
    const rows = collectionView(answers, ['commodityLines'])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ index: 0, path: ['commodityLines', 0] })
    expect(rows[0].entry).toBe(completeLine)
    expect(rows[1]).toMatchObject({ index: 1, path: ['commodityLines', 1] })
    expect(rows[1].entry).toBe(incompleteLine)
  })

  it('Should set complete per-row from entryComplete across a mixed list', () => {
    const rows = collectionView(
      { commodityLines: [completeLine, incompleteLine] },
      ['commodityLines']
    )
    expect(rows[0].complete).toBe(true)
    expect(rows[1].complete).toBe(false)
  })

  it('Should resolve a nested collection path to its own obligation and entries', () => {
    const answers = { commodityLines: [completeLine] }
    const rows = collectionView(answers, [
      'commodityLines',
      0,
      'animalIdentifiers'
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      index: 0,
      path: ['commodityLines', 0, 'animalIdentifiers', 0]
    })
    expect(rows[0].entry).toBe(completeLine.animalIdentifiers[0])
    expect(rows[0].complete).toBe(true)
  })

  it('Should fall back to complete:true when the collection path matches no obligation', () => {
    const rows = collectionView({ mystery: [{ a: 1 }] }, ['mystery'])
    expect(rows).toEqual([
      { index: 0, path: ['mystery', 0], entry: { a: 1 }, complete: true }
    ])
  })

  it('Should return an empty list when the collection is absent from answers', () => {
    expect(collectionView({}, ['commodityLines'])).toEqual([])
  })
})
