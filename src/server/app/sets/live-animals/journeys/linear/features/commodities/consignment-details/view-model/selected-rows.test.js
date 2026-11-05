import { describe, expect, it } from 'vitest'

import { buildSelectedRows } from './selected-rows.js'
import { lineKey } from '../../search/selection/line-key.js'
import { commodityLinesFixture } from '../../test-support.js'
import {
  BISON_BISON,
  BISON_BISON_ROW,
  BOS_TAURUS,
  BOS_TAURUS_ROW,
  FELIS_CATUS,
  FELIS_CATUS_ROW,
  MUSTELA_PUTORIUS_FURO,
  MUSTELA_PUTORIUS_FURO_ROW,
  STRUTHIO,
  STRUTHIO_ROW,
  labelFor
} from '../../search/test-support.js'

describe('#buildSelectedRows', () => {
  it('Should give a code one row naming the commodity code, listing the label of every species under it', () => {
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
        labels: [labelFor(BOS_TAURUS), labelFor(BISON_BISON)],
        removeAction: 'remove:0102'
      },
      {
        code: '01063300',
        labels: [labelFor(STRUTHIO)],
        removeAction: 'remove:01063300'
      }
    ])
  })

  it('Should name a code row by its commodity code even where a species group is built before it', () => {
    expect(
      buildSelectedRows(
        commodityLinesFixture([FELIS_CATUS_ROW], [STRUTHIO_ROW])
      )
    ).toEqual([
      {
        code: '01061900',
        labels: [labelFor(FELIS_CATUS)],
        removeAction: `remove-species:${lineKey(FELIS_CATUS_ROW)}`
      },
      {
        code: '01063300',
        labels: [labelFor(STRUTHIO)],
        removeAction: 'remove:01063300'
      }
    ])
  })

  it('Should give each species on code 01061900 its own row and its own remove naming its line key', () => {
    expect(
      buildSelectedRows(
        commodityLinesFixture(
          [BOS_TAURUS_ROW],
          [MUSTELA_PUTORIUS_FURO_ROW],
          [FELIS_CATUS_ROW]
        )
      )
    ).toEqual([
      {
        code: '0102',
        labels: [labelFor(BOS_TAURUS)],
        removeAction: 'remove:0102'
      },
      {
        code: '01061900',
        labels: [labelFor(MUSTELA_PUTORIUS_FURO)],
        removeAction: `remove-species:${lineKey(MUSTELA_PUTORIUS_FURO_ROW)}`
      },
      {
        code: '01061900',
        labels: [labelFor(FELIS_CATUS)],
        removeAction: `remove-species:${lineKey(FELIS_CATUS_ROW)}`
      }
    ])
  })
})
