import { describe, expect, it } from 'vitest'

import { commodityGroups } from './commodity-groups.js'

const matchedTextOf = (parts) =>
  parts.filter((part) => part.matched).map((part) => part.text)

describe('#commodityGroups', () => {
  it('Should mark the commodity name in the legend when the name matched', () => {
    const [cow] = commodityGroups([], 'cow')
    expect(cow.legendParts).toEqual([
      { text: 'Cow', matched: true },
      { text: ' (0102)', matched: false }
    ])
    expect(cow.items.flatMap((item) => matchedTextOf(item.textParts))).toEqual(
      []
    )
  })

  it('Should mark the leading digits of the code in the legend when the code matched', () => {
    const [cat] = commodityGroups([], '0106')
    expect(cat.legendParts).toEqual([
      { text: 'Cat (', matched: false },
      { text: '0106', matched: true },
      { text: '1900)', matched: false }
    ])
  })

  it('Should mark only the species label when only the species matched', () => {
    const [cow] = commodityGroups([], 'cattle')
    expect(matchedTextOf(cow.legendParts)).toEqual([])
    expect(cow.items.map((item) => matchedTextOf(item.textParts))).toEqual([
      ['Cattle'],
      ['cattle']
    ])
  })
})
