import { describe, expect, it } from 'vitest'

import { buildSelectedCommodities } from './selected-commodities.js'
import { commodityLinesFixture } from '../../test-support.js'
import {
  BISON_BISON,
  BISON_BISON_ROW,
  BOS_TAURUS,
  BOS_TAURUS_ROW,
  CANIS_FAMILIARIS,
  CANIS_FAMILIARIS_ROW,
  FELIS_CATUS,
  FELIS_CATUS_ROW,
  STRUTHIO,
  STRUTHIO_ROW
} from '../../search/test-support.js'

describe('#buildSelectedCommodities', () => {
  it('Should give a code one row listing every species under it and the total of their animals', () => {
    expect(
      buildSelectedCommodities(
        commodityLinesFixture(
          [BOS_TAURUS_ROW, 2],
          [BISON_BISON_ROW, 5],
          [STRUTHIO_ROW, 1]
        )
      )
    ).toEqual([
      {
        code: '0102',
        name: 'Cattle or Cow, Bisons Spp',
        latinNames: [BOS_TAURUS, BISON_BISON],
        animals: '7'
      },
      {
        code: '01063300',
        name: 'Ostriches',
        latinNames: [STRUTHIO],
        animals: '1'
      }
    ])
  })

  it('Should read the declared count as text whether it was stored as a number or re-rendered as an entered string', () => {
    expect(
      buildSelectedCommodities(
        commodityLinesFixture([BOS_TAURUS_ROW, 25], [STRUTHIO_ROW, '7'])
      ).map(({ animals }) => animals)
    ).toEqual(['25', '7'])
  })

  it('Should give an empty animals count for a code whose lines have no count yet', () => {
    expect(
      buildSelectedCommodities(commodityLinesFixture([BOS_TAURUS_ROW]))
    ).toEqual([
      {
        code: '0102',
        name: 'Cattle or Cow',
        latinNames: [BOS_TAURUS],
        animals: ''
      }
    ])
  })

  it('Should give each species on code 01061900 its own row counted on its own', () => {
    expect(
      buildSelectedCommodities(
        commodityLinesFixture([CANIS_FAMILIARIS_ROW, 1], [FELIS_CATUS_ROW, 4])
      ).map(({ code, name, latinNames, animals }) => [
        code,
        name,
        latinNames,
        animals
      ])
    ).toEqual([
      ['01061900', 'Dog', [CANIS_FAMILIARIS], '1'],
      ['01061900', 'Domestic Cat', [FELIS_CATUS], '4']
    ])
  })

  it('Should total only the counted lines of a code', () => {
    expect(
      buildSelectedCommodities(
        commodityLinesFixture([BOS_TAURUS_ROW, '2'], [BISON_BISON_ROW, ''])
      )
    ).toEqual([
      {
        code: '0102',
        name: 'Cattle or Cow, Bisons Spp',
        latinNames: [BOS_TAURUS, BISON_BISON],
        animals: '2'
      }
    ])
  })

  it('Should build no rows for an empty selection', () => {
    expect(buildSelectedCommodities([])).toEqual([])
  })
})
