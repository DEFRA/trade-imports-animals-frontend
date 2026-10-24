import { describe, expect, it } from 'vitest'

import { buildSelectedRows } from './selected-rows.js'
import { BOS_TAURUS, FELIS_CATUS } from '../../search/test-support.js'

const REMOVE_FIRST_SPECIES = 'remove-species:0'

const indexedLines = (...triples) =>
  triples.map(
    ([commodityCode, speciesLatinName, speciesCommonName], index) => ({
      index,
      entry: { commodityCode, speciesLatinName, speciesCommonName }
    })
  )

describe('#buildSelectedRows', () => {
  it('Should give a code one row keyed to its group index, naming the Latin name of each species chosen under it', () => {
    expect(
      buildSelectedRows(
        indexedLines(
          ['0102', BOS_TAURUS, 'Cattle or Cow'],
          ['0102', 'Bison bison', 'Bisons Spp'],
          ['01063300', 'Struthio', 'Ostriches']
        )
      )
    ).toEqual([
      {
        code: '0102',
        name: 'Bos taurus, Bison bison',
        removeAction: 'remove:0'
      },
      { code: '01063300', name: 'Struthio', removeAction: 'remove:1' }
    ])
  })

  it('Should key a code row to its group index even where a species group is built before it', () => {
    expect(
      buildSelectedRows(
        indexedLines(
          ['01061900', FELIS_CATUS, 'Domestic Cat'],
          ['01063300', 'Struthio', 'Ostriches']
        )
      )
    ).toEqual([
      {
        code: '01061900',
        name: FELIS_CATUS,
        removeAction: REMOVE_FIRST_SPECIES
      },
      { code: '01063300', name: 'Struthio', removeAction: 'remove:1' }
    ])
  })

  it('Should give each species on code 01061900 its own row and its own remove', () => {
    expect(
      buildSelectedRows(
        indexedLines(
          ['0102', BOS_TAURUS, 'Cattle or Cow'],
          ['01061900', 'Canis familiaris', 'Dog'],
          ['01061900', FELIS_CATUS, 'Domestic Cat']
        )
      )
    ).toEqual([
      { code: '0102', name: BOS_TAURUS, removeAction: 'remove:0' },
      {
        code: '01061900',
        name: 'Canis familiaris',
        removeAction: 'remove-species:1'
      },
      {
        code: '01061900',
        name: FELIS_CATUS,
        removeAction: 'remove-species:2'
      }
    ])
  })

  it('Should build no rows for an empty selection', () => {
    expect(buildSelectedRows([])).toEqual([])
  })
})
