import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildSelectedCommodities } from './selected-commodities.js'
import * as commodities from '../../../../../../services/commodities/index.js'

const BOS_TAURUS = '1148346'
const BISON_BISON = '716661'

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

afterEach(() => vi.restoreAllMocks())

describe('#buildSelectedCommodities', () => {
  it('Should give every commodity line its own summary row so the table pairs with the cards', () => {
    expect(
      buildSelectedCommodities(
        linesOf(
          ['Cow', BOS_TAURUS, 2],
          ['Cow', BISON_BISON, 5],
          ['Fish', '801204', 1]
        )
      )
    ).toEqual([
      { code: '0102', name: 'Domestic cattle', animals: '2' },
      { code: '0102', name: 'American bison', animals: '5' },
      { code: '0301', name: 'Atlantic salmon', animals: '1' }
    ])
  })

  it('Should read the declared count as text whether it was stored as a number or re-rendered as an entered string', () => {
    expect(
      buildSelectedCommodities(
        linesOf(['Cow', BOS_TAURUS, 25], ['Fish', '801204', '7'])
      ).map(({ animals }) => animals)
    ).toEqual(['25', '7'])
  })

  it('Should show nothing rather than a placeholder for a line with no count yet', () => {
    expect(
      buildSelectedCommodities(linesOf(['Cow', BOS_TAURUS, undefined]))
    ).toEqual([{ code: '0102', name: 'Domestic cattle', animals: '' }])
  })

  it('Should name each row from the species own common name, not from its commodity', () => {
    const commonName = vi
      .spyOn(commodities, 'speciesCommonName')
      .mockReturnValue('Domestic dog')

    expect(buildSelectedCommodities(linesOf(['Dog', '923502', 1]))).toEqual([
      { code: '01061900', name: 'Domestic dog', animals: '1' }
    ])
    expect(commonName).toHaveBeenCalledWith('Dog', '923502')
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
