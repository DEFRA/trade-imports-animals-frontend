import { describe, expect, it } from 'vitest'

import { buildCommodityGroups } from './commodity-groups.js'
import { commodityLinesFixture } from '../test-support.js'
import {
  BISON_BISON_ROW,
  BOS_TAURUS_ROW,
  EQUUS_CABALUS_ROW
} from '../search/test-support.js'

describe('#buildCommodityGroups', () => {
  it('Should group the species lines under each code in selection order, headed by the code', () => {
    const groups = buildCommodityGroups(
      commodityLinesFixture(
        [BOS_TAURUS_ROW],
        [EQUUS_CABALUS_ROW],
        [BISON_BISON_ROW]
      )
    )

    expect(
      groups.map(({ index, heading, lines }) => [
        index,
        heading,
        lines.map(({ index: lineIndex }) => lineIndex)
      ])
    ).toEqual([
      [0, '0102', [0, 2]],
      [1, '0101', [1]]
    ])
  })

  it('Should build no groups for an empty selection', () => {
    expect(buildCommodityGroups([])).toEqual([])
  })
})
