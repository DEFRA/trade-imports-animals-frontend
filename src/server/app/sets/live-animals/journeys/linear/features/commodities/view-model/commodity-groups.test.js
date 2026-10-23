import { describe, expect, it } from 'vitest'

import { buildCommodityGroups } from './commodity-groups.js'

const lineRecordsOf = (...pairs) =>
  pairs.map(([commoditySelection, speciesSelection], index) => ({
    index,
    entry: { commoditySelection, speciesSelection }
  }))

describe('#buildCommodityGroups', () => {
  it('Should group the species lines under each commodity in selection order, headed by its name and code', () => {
    const groups = buildCommodityGroups(
      lineRecordsOf(['Cow', '1148346'], ['Horse', '822332'], ['Cow', '716661'])
    )

    expect(
      groups.map(({ index, heading, lines }) => [
        index,
        heading,
        lines.map(({ index: lineIndex }) => lineIndex)
      ])
    ).toEqual([
      [0, 'Cow (0102)', [0, 2]],
      [1, 'Horse (0101)', [1]]
    ])
  })

  it('Should head a commodity with no code by its name alone', () => {
    const groups = buildCommodityGroups(lineRecordsOf(['Unlisted animal', '1']))

    expect(groups.map(({ heading }) => heading)).toEqual(['Unlisted animal'])
  })

  it('Should build no groups for an empty selection', () => {
    expect(buildCommodityGroups([])).toEqual([])
  })
})
