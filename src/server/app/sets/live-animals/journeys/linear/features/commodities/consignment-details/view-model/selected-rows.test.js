import { describe, expect, it } from 'vitest'

import { buildSelectedRows } from './selected-rows.js'
const DOMESTIC_CAT = 'Domestic Cat'
const CATTLE_OR_COW = 'Cattle or Cow'

const REMOVE_FIRST_SPECIES = 'remove-species:0'

const linesOf = (...triples) =>
  triples.map(([commoditySelection, speciesSelection, commonName], index) => ({
    index,
    entry: { commoditySelection, speciesSelection, commonName }
  }))

describe('#buildSelectedRows', () => {
  it('Should give a code one row keyed to its group index, naming the species chosen under it', () => {
    expect(
      buildSelectedRows(
        linesOf(
          ['0102', 'Bos taurus', CATTLE_OR_COW],
          ['0102', 'Bison bison', 'Bisons Spp'],
          ['01063300', 'Struthio', 'Ostriches']
        )
      )
    ).toEqual([
      {
        code: '0102',
        name: 'Cattle or Cow, Bisons Spp',
        removeAction: 'remove:0'
      },
      { code: '01063300', name: 'Ostriches', removeAction: 'remove:1' }
    ])
  })

  it('Should key a code row to its group index even where a species group is built before it', () => {
    // 01061900 sorts before 01063300, so the ostriches are the second group and
    // their remove must say so — the index keys back to the group list that
    // post-remove resolves, not to the rows already built.
    expect(
      buildSelectedRows(
        linesOf(
          ['01061900', 'Felis catus', DOMESTIC_CAT],
          ['01063300', 'Struthio', 'Ostriches']
        )
      )
    ).toEqual([
      {
        code: '01061900',
        name: DOMESTIC_CAT,
        removeAction: REMOVE_FIRST_SPECIES
      },
      { code: '01063300', name: 'Ostriches', removeAction: 'remove:1' }
    ])
  })

  it('Should give each species on code 01061900 its own row and its own remove', () => {
    expect(
      buildSelectedRows(
        linesOf(
          ['0102', 'Bos taurus', CATTLE_OR_COW],
          ['01061900', 'Canis familiaris', 'Dog'],
          ['01061900', 'Felis catus', DOMESTIC_CAT]
        )
      )
    ).toEqual([
      { code: '0102', name: CATTLE_OR_COW, removeAction: 'remove:0' },
      { code: '01061900', name: 'Dog', removeAction: 'remove-species:1' },
      {
        code: '01061900',
        name: DOMESTIC_CAT,
        removeAction: 'remove-species:2'
      }
    ])
  })

  // MDM has no common name for some species.
  it('Should name a species by its Latin name where it has no common name', () => {
    expect(
      buildSelectedRows(linesOf(['01061900', 'Catagonus', undefined]))
    ).toEqual([
      {
        code: '01061900',
        name: 'Catagonus',
        removeAction: REMOVE_FIRST_SPECIES
      }
    ])
  })

  it('Should build no rows for an empty selection', () => {
    expect(buildSelectedRows([])).toEqual([])
  })
})
