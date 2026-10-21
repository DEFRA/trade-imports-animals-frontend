import { describe, expect, it } from 'vitest'

import { BOS_TAURUS_ROW, FELIS_CATUS_ROW } from '../test-support.js'
import { knownRows, lineRow, resultRows } from './rows.js'

describe('#resultRows', () => {
  it('Should give one row per species in the search results, with its code', () => {
    expect(
      resultRows({
        groups: [
          {
            code: FELIS_CATUS_ROW.commodityCode,
            species: [
              {
                latinName: FELIS_CATUS_ROW.speciesLatinName,
                commonName: FELIS_CATUS_ROW.commonName
              }
            ]
          }
        ]
      })
    ).toEqual([FELIS_CATUS_ROW])
  })

  it('Should give no rows before a search', () => {
    expect(resultRows(null)).toEqual([])
  })
})

describe('#knownRows', () => {
  it('Should know the rows earlier searches showed and the lines already saved, by key', () => {
    const known = knownRows({
      answers: {
        commodityLines: [{ ...BOS_TAURUS_ROW, numberOfAnimalsQuantity: '3' }]
      },
      flowOnlyAnswers: { commoditySearchRows: [FELIS_CATUS_ROW] }
    })

    expect([...known.keys()]).toEqual([
      '01061900|Felis catus',
      '0102|Bos taurus'
    ])
    expect(known.get('0102|Bos taurus')).toEqual(BOS_TAURUS_ROW)
  })

  it('Should know nothing on a fresh notification', () => {
    expect(knownRows({ answers: {} }).size).toBe(0)
  })
})

describe('#lineRow', () => {
  it('Should read a stored line back as the row it was saved from', () => {
    expect(
      lineRow({ ...FELIS_CATUS_ROW, numberOfAnimalsQuantity: '2' })
    ).toEqual(FELIS_CATUS_ROW)
  })
})
