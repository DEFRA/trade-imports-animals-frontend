import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildSelectedRows } from './selected-rows.js'
import * as commodities from '../../../../../../services/commodities/index.js'

const REMOVE_FIRST_SPECIES = 'remove-species:0'

const linesOf = (...pairs) =>
  pairs.map(([commoditySelection, speciesSelection], index) => ({
    index,
    entry: { commoditySelection, speciesSelection }
  }))

afterEach(() => vi.restoreAllMocks())

describe('#buildSelectedRows', () => {
  it('Should give a commodity one row keyed to its group index, however many species it holds', () => {
    expect(
      buildSelectedRows(
        linesOf(['Cow', '1148346'], ['Cow', '716661'], ['Fish', '801204'])
      )
    ).toEqual([
      { code: '0102', name: 'Cow', removeAction: 'remove:0' },
      { code: '0301', name: 'Fish', removeAction: 'remove:1' }
    ])
  })

  it('Should key a commodity row to its group index even where a species group is built before it', () => {
    // Canonical order puts Cat (01061900) before Fish, so Fish is the second
    // group and its remove must say so — the index keys back to the group list
    // that post-remove resolves, not to the rows already built.
    expect(
      buildSelectedRows(linesOf(['Cat', '923501'], ['Fish', '801204']))
    ).toEqual([
      { code: '01061900', name: 'Cat', removeAction: REMOVE_FIRST_SPECIES },
      { code: '0301', name: 'Fish', removeAction: 'remove:1' }
    ])
  })

  it('Should give each species of a commodity on code 01061900 its own row and its own remove', () => {
    expect(
      buildSelectedRows(
        linesOf(['Cow', '1148346'], ['Dog', '923502'], ['Cat', '923501'])
      )
    ).toEqual([
      { code: '0102', name: 'Cow', removeAction: 'remove:0' },
      { code: '01061900', name: 'Dog', removeAction: 'remove-species:1' },
      { code: '01061900', name: 'Cat', removeAction: 'remove-species:2' }
    ])
  })

  it('Should name a species row from the species own common name rather than from its commodity', () => {
    // Every 01061900 species in today's stub is called after its commodity, so
    // the catalogue is stubbed here to tell the two apart at all.
    const commonName = vi
      .spyOn(commodities, 'speciesCommonName')
      .mockImplementation((name, value) =>
        value === '923502' ? 'Domestic dog' : name
      )

    expect(buildSelectedRows(linesOf(['Dog', '923502']))).toEqual([
      {
        code: '01061900',
        name: 'Domestic dog',
        removeAction: REMOVE_FIRST_SPECIES
      }
    ])
    expect(commonName).toHaveBeenCalledWith('Dog', '923502')
  })

  it('Should give two species of one 01061900 commodity a row and a remove each, keyed to their own stored lines', () => {
    // Today's stub holds one species per 01061900 commodity, so the second
    // species is seeded straight in — see inc-091's open question.
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
