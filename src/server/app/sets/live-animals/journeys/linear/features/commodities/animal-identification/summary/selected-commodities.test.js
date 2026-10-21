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
  it('Should give every commodity line a summary row with its code, species name and animal count', () => {
    expect(
      buildSelectedCommodities(
        linesOf(
          ['0102', BOS_TAURUS, CATTLE_OR_COW, 2],
          ['0102', 'Bison bison', 'Bisons Spp', 5],
          ['01063300', 'Struthio', 'Ostriches', 1]
        )
      )
    ).toEqual([
      { code: '0102', name: CATTLE_OR_COW, animals: '2' },
      { code: '0102', name: 'Bisons Spp', animals: '5' },
      { code: '01063300', name: 'Ostriches', animals: '1' }
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
    ).toEqual([{ code: '0102', name: CATTLE_OR_COW, animals: '' }])
  })

  it('Should name a row by its Latin name where the species has no common name', () => {
    expect(
      buildSelectedCommodities(linesOf(['01061900', 'Catagonus', undefined, 1]))
    ).toEqual([{ code: '01061900', name: 'Catagonus', animals: '1' }])
  })

  it('Should build no rows for an empty selection', () => {
    expect(buildSelectedCommodities([])).toEqual([])
  })
})
