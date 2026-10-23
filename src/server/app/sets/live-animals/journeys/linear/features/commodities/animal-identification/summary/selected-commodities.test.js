import { describe, expect, it } from 'vitest'

import { buildSelectedCommodities } from './selected-commodities.js'
const CATTLE_OR_COW = 'Cattle or Cow'
const BOS_TAURUS = 'Bos taurus'

const linesOf = (...rows) =>
  rows.map(
    (
      [commodityCode, speciesLatinName, commonName, numberOfAnimalsQuantity],
      index
    ) => ({
      index,
      entry: {
        commodityCode,
        speciesLatinName,
        commonName,
        numberOfAnimalsQuantity
      }
    })
  )

describe('#buildSelectedCommodities', () => {
  it('Should give every commodity line a summary row with its code, the Latin name of its species and its animal count', () => {
    expect(
      buildSelectedCommodities(
        linesOf(
          ['0102', BOS_TAURUS, CATTLE_OR_COW, 2],
          ['0102', 'Bison bison', 'Bisons Spp', 5],
          ['01063300', 'Struthio', 'Ostriches', 1]
        )
      )
    ).toEqual([
      { code: '0102', name: BOS_TAURUS, animals: '2' },
      { code: '0102', name: 'Bison bison', animals: '5' },
      { code: '01063300', name: 'Struthio', animals: '1' }
    ])
  })

  it('Should read the declared count as text whether it was stored as a number or re-rendered as an entered string', () => {
    expect(
      buildSelectedCommodities(
        linesOf(
          ['0102', BOS_TAURUS, CATTLE_OR_COW, 25],
          ['01063300', 'Struthio', 'Ostriches', '7']
        )
      ).map(({ animals }) => animals)
    ).toEqual(['25', '7'])
  })

  it('Should show nothing rather than a placeholder for a line with no count yet', () => {
    expect(
      buildSelectedCommodities(
        linesOf(['0102', BOS_TAURUS, CATTLE_OR_COW, undefined])
      )
    ).toEqual([{ code: '0102', name: BOS_TAURUS, animals: '' }])
  })

  it('Should build no rows for an empty selection', () => {
    expect(buildSelectedCommodities([])).toEqual([])
  })
})
