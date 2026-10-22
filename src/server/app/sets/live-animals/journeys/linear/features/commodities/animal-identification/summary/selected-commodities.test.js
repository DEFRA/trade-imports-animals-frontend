import { describe, expect, it } from 'vitest'

import { buildSelectedCommodities } from './selected-commodities.js'

const BOS_TAURUS = '1148346'
const BISON_BISON = '716661'
const BOS_TAURUS_LATIN = 'Bos taurus'

const linesOf = (...triples) =>
  triples.map(
    (
      [commoditySelection, speciesSelection, numberOfAnimalsQuantity],
      index
    ) => ({
      index,
      entry: { commoditySelection, speciesSelection, numberOfAnimalsQuantity }
    })
  )

describe('#buildSelectedCommodities', () => {
  it('Should give a commodity one row listing every species under it and the total of their animals', () => {
    expect(
      buildSelectedCommodities(
        linesOf(
          ['Cow', BOS_TAURUS, 2],
          ['Cow', BISON_BISON, 5],
          ['Fish', '801204', 1]
        )
      )
    ).toEqual([
      {
        code: '0102',
        name: 'Cow',
        latinNames: [BOS_TAURUS_LATIN, 'Bison bison'],
        animals: '7'
      },
      {
        code: '0301',
        name: 'Fish',
        latinNames: ['Salmo salar'],
        animals: '1'
      }
    ])
  })

  it('Should read the declared count as text whether it was stored as a number or re-rendered as an entered string', () => {
    expect(
      buildSelectedCommodities(
        linesOf(['Cow', BOS_TAURUS, 25], ['Fish', '801204', '7'])
      ).map(({ animals }) => animals)
    ).toEqual(['25', '7'])
  })

  it('Should show nothing rather than a placeholder for a commodity whose lines have no count yet', () => {
    expect(
      buildSelectedCommodities(linesOf(['Cow', BOS_TAURUS, undefined]))
    ).toEqual([
      {
        code: '0102',
        name: 'Cow',
        latinNames: [BOS_TAURUS_LATIN],
        animals: ''
      }
    ])
  })

  it('Should give each species of a commodity on code 01061900 its own row counted on its own', () => {
    expect(
      buildSelectedCommodities(
        linesOf(['Dog', '923502', 1], ['Cat', '923501', 4])
      ).map(({ code, name, latinNames, animals }) => [
        code,
        name,
        latinNames,
        animals
      ])
    ).toEqual([
      ['01061900', 'Dog', ['Canis lupus familiaris'], '1'],
      ['01061900', 'Cat', ['Felis catus'], '4']
    ])
  })

  it('Should total only the counted lines of a commodity', () => {
    expect(
      buildSelectedCommodities(
        linesOf(['Cow', BOS_TAURUS, '2'], ['Cow', BISON_BISON, ''])
      )
    ).toEqual([
      {
        code: '0102',
        name: 'Cow',
        latinNames: [BOS_TAURUS_LATIN, 'Bison bison'],
        animals: '2'
      }
    ])
  })

  it('Should leave the code blank for a commodity the catalogue holds no code for', () => {
    expect(
      buildSelectedCommodities(linesOf(['Unlisted', '999999', 1])).map(
        ({ code }) => code
      )
    ).toEqual([''])
  })

  it('Should build no rows for an empty selection', () => {
    expect(buildSelectedCommodities([])).toEqual([])
  })
})
