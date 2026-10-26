import { describe, expect, test } from 'vitest'
import { commodityFieldForListRow } from './commodity-field-for-list-row.js'

describe('commodityFieldForListRow', () => {
  test('Should use the sole commodities[] entry name when there is one', () => {
    expect(
      commodityFieldForListRow({
        commodities: [{ name: 'Cow' }]
      })
    ).toEqual({ name: 'Cow' })
  })

  test('Should join multiple commodities[] entry names', () => {
    expect(
      commodityFieldForListRow({
        commodities: [{ name: 'Cow' }, { name: 'Cat' }]
      })
    ).toEqual({ name: 'Cow, Cat' })
  })

  test('Should return null when commodities[] names are all blank', () => {
    expect(
      commodityFieldForListRow({
        commodities: [{ name: '' }, { name: null }]
      })
    ).toBeNull()
  })

  test('Should fall back to legacy commodity when commodities[] is absent or empty', () => {
    expect(
      commodityFieldForListRow({
        commodity: { name: 'Horse' }
      })
    ).toEqual({ name: 'Horse' })
    expect(
      commodityFieldForListRow({
        commodities: [],
        commodity: { name: 'Horse' }
      })
    ).toEqual({ name: 'Horse' })
  })

  test('Should return null when no commodity label is available', () => {
    expect(commodityFieldForListRow({})).toBeNull()
  })
})
