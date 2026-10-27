import { describe, expect, it } from 'vitest'

import { buildSelectedRows } from './selected-rows.js'
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

const REMOVE_FIRST_SPECIES = 'remove-species:0'

describe('#buildSelectedRows', () => {
  it('Should give a code one row keyed to its group index, listing the Latin name of every species under it', () => {
    expect(
      buildSelectedRows(
        commodityLinesFixture(
          [BOS_TAURUS_ROW],
          [BISON_BISON_ROW],
          [STRUTHIO_ROW]
        )
      )
    ).toEqual([
      {
        code: '0102',
        latinNames: [BOS_TAURUS, BISON_BISON],
        removeAction: 'remove:0'
      },
      {
        code: '01063300',
        latinNames: [STRUTHIO],
        removeAction: 'remove:1'
      }
    ])
  })

  it('Should key a code row to its group index even where a species group is built before it', () => {
    expect(
      buildSelectedRows(
        commodityLinesFixture([FELIS_CATUS_ROW], [STRUTHIO_ROW])
      )
    ).toEqual([
      {
        code: '01061900',
        latinNames: [FELIS_CATUS],
        removeAction: REMOVE_FIRST_SPECIES
      },
      {
        code: '01063300',
        latinNames: [STRUTHIO],
        removeAction: 'remove:1'
      }
    ])
  })

  it('Should give each species on code 01061900 its own row and its own remove', () => {
    expect(
      buildSelectedRows(
        commodityLinesFixture(
          [BOS_TAURUS_ROW],
          [CANIS_FAMILIARIS_ROW],
          [FELIS_CATUS_ROW]
        )
      )
    ).toEqual([
      {
        code: '0102',
        latinNames: [BOS_TAURUS],
        removeAction: 'remove:0'
      },
      {
        code: '01061900',
        latinNames: [CANIS_FAMILIARIS],
        removeAction: 'remove-species:1'
      },
      {
        code: '01061900',
        latinNames: [FELIS_CATUS],
        removeAction: 'remove-species:2'
      }
    ])
  })
})
