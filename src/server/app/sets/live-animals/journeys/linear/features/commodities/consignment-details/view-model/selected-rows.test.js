import { describe, expect, it } from 'vitest'

import { buildSelectedRows } from './selected-rows.js'

const REMOVE_FIRST_SPECIES = 'remove-species:0'
const BOS_TAURUS = 'Bos taurus'

const linesOf = (...pairs) =>
  pairs.map(([commoditySelection, speciesSelection], index) => ({
    index,
    entry: { commoditySelection, speciesSelection }
  }))

describe('#buildSelectedRows', () => {
  it('Should give a commodity one row keyed to its group index, listing the Latin name of every species under it', () => {
    expect(
      buildSelectedRows(
        linesOf(['Cow', '1148346'], ['Cow', '716661'], ['Fish', '801204'])
      )
    ).toEqual([
      {
        code: '0102',
        name: 'Cow',
        latinNames: [BOS_TAURUS, 'Bison bison'],
        removeAction: 'remove:0'
      },
      {
        code: '0301',
        name: 'Fish',
        latinNames: ['Salmo salar'],
        removeAction: 'remove:1'
      }
    ])
  })

  it('Should key a commodity row to its group index even where a species group is built before it', () => {
    expect(
      buildSelectedRows(linesOf(['Cat', '923501'], ['Fish', '801204']))
    ).toEqual([
      {
        code: '01061900',
        name: 'Cat',
        latinNames: ['Felis catus'],
        removeAction: REMOVE_FIRST_SPECIES
      },
      {
        code: '0301',
        name: 'Fish',
        latinNames: ['Salmo salar'],
        removeAction: 'remove:1'
      }
    ])
  })

  it('Should give each species of a commodity on code 01061900 its own row and its own remove', () => {
    expect(
      buildSelectedRows(
        linesOf(['Cow', '1148346'], ['Dog', '923502'], ['Cat', '923501'])
      )
    ).toEqual([
      {
        code: '0102',
        name: 'Cow',
        latinNames: [BOS_TAURUS],
        removeAction: 'remove:0'
      },
      {
        code: '01061900',
        name: 'Dog',
        latinNames: ['Canis lupus familiaris'],
        removeAction: 'remove-species:1'
      },
      {
        code: '01061900',
        name: 'Cat',
        latinNames: ['Felis catus'],
        removeAction: 'remove-species:2'
      }
    ])
  })

  it('Should give two species of one 01061900 commodity a row and a remove each, keyed to their own stored lines', () => {
    expect(
      buildSelectedRows(linesOf(['Dog', '923502'], ['Dog', '900001'])).map(
        ({ code, removeAction }) => [code, removeAction]
      )
    ).toEqual([
      ['01061900', REMOVE_FIRST_SPECIES],
      ['01061900', 'remove-species:1']
    ])
  })

  it('Should build no rows for an empty selection', () => {
    expect(buildSelectedRows([])).toEqual([])
  })
})
