import { describe, expect, it } from 'vitest'
import { collectionCapAt } from './cardinality.js'

describe('#collectionCapAt', () => {
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
