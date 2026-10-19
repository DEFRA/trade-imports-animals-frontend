import { describe, expect, it } from 'vitest'

import { knownRows, lineRow, resultRows } from './rows.js'

const FELIS_CATUS = {
  code: '01061900',
  latinName: 'Felis catus',
  commonName: 'Domestic Cat'
}

describe('#resultRows', () => {
  it('Should give one row per species in the search results, with its code', () => {
    expect(
      resultRows({
        groups: [
          {
            code: '01061900',
            species: [
              {
                latinName: FELIS_CATUS.latinName,
                commonName: FELIS_CATUS.commonName
              }
            ]
          }
        ]
      })
    ).toEqual([FELIS_CATUS])
  })

  it('Should give no rows before a search', () => {
    expect(resultRows(null)).toEqual([])
  })
})

describe('#knownRows', () => {
  it('Should know the rows earlier searches showed and the lines already saved, by key', () => {
    const known = knownRows({
      answers: {
        commodityLines: [
          {
            commoditySelection: '0102',
            speciesSelection: 'Bos taurus',
            commonName: 'Cattle or Cow'
          }
        ]
      },
      flowOnlyAnswers: { commoditySearchRows: [FELIS_CATUS] }
    })
    expect([...known.keys()]).toEqual([
      '01061900|Felis catus',
      '0102|Bos taurus'
    ])
    expect(known.get('0102|Bos taurus')).toEqual({
      code: '0102',
      latinName: 'Bos taurus',
      commonName: 'Cattle or Cow'
    })
  })

  it('Should know nothing on a fresh notification', () => {
    expect(knownRows({ answers: {} }).size).toBe(0)
  })
})

describe('#lineRow', () => {
  it('Should read a stored line back as the row it was saved from', () => {
    expect(
      lineRow({
        commoditySelection: '01061900',
        speciesSelection: FELIS_CATUS.latinName,
        commonName: FELIS_CATUS.commonName
      })
    ).toEqual(FELIS_CATUS)
  })
})
