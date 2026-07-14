import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import { driveHandler, postHandlerOf } from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as search from './search.controller.js'

const post = postHandlerOf(search)

describe('POST commodities (batch search-select)', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it('Should re-render an empty selection with its message and create nothing', async () => {
    const result = await driveHandler(post, { payload: { search: 'cow' } })
    expect(result.view.context.errors.search).toBe('Select a commodity')
    expect(result.after).toEqual(result.before)
  })

  it('Should render grouped results for a search action without saving', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'search', search: '0102' }
    })
    expect(result.view.context.results).toEqual([
      {
        legend: 'Cow (0102)',
        items: [
          { value: 'Cow|716661', text: 'Bison bison', checked: false },
          { value: 'Cow|1388624', text: 'Bos spp.', checked: false },
          { value: 'Cow|1148346', text: 'Bos taurus', checked: false },
          { value: 'Cow|749313', text: 'Bubalus bubalis', checked: false }
        ]
      }
    ])
    expect(result.after).toEqual(result.before)
  })

  it('Should find a commodity by scientific name and mark carried selections checked', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'search',
        search: 'bos taurus',
        selected: ['Cow|1148346']
      }
    })
    const [group] = result.view.context.results
    expect(group.legend).toBe('Cow (0102)')
    expect(
      group.items.find((item) => item.value === 'Cow|1148346').checked
    ).toBe(true)
  })

  it('Should create one line per selected species across commodity codes, in canonical order', async () => {
    const result = await driveHandler(post, {
      payload: { species: ['Cat|923501', 'Cow|716661', 'Cow|1148346'] }
    })
    expect(result.after.commodityLines).toEqual([
      {
        commoditySelection: 'Cow',
        speciesSelection: '716661',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      },
      {
        commoditySelection: 'Cow',
        speciesSelection: '1148346',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      },
      {
        commoditySelection: 'Cat',
        speciesSelection: '923501',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      }
    ])
    expect(result.response.redirect).toContain('consignment-details')
  })

  it("Should preserve a still-selected line's data and drop a deselected one on reselect (c-017)", async () => {
    const kept = {
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
    }
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          kept,
          {
            commoditySelection: 'Cat',
            speciesSelection: '923501',
            numberOfAnimalsQuantity: '2'
          }
        ]
      },
      payload: {
        // The Cat box was shown and unticked; Cow carried via hidden input.
        selected: ['Cow|1148346', 'Cat|923501'],
        shown: ['Cat|923501']
      }
    })
    expect(result.after.commodityLines).toEqual([kept])
  })

  it('Should treat an unchecked-but-shown species as deselected and a not-shown one as carried', async () => {
    const result = await driveHandler(post, {
      payload: {
        selected: ['Cow|1148346', 'Dog|923502'],
        shown: ['Cow|1148346', 'Cow|716661'],
        species: ['Cow|716661']
      }
    })
    expect(
      result.after.commodityLines.map((line) => line.speciesSelection)
    ).toEqual(['716661', '923502'])
  })

  it('Should drop a selection from the summary via its remove action without saving', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          { commoditySelection: 'Cow', speciesSelection: '1148346' }
        ]
      },
      payload: {
        action: 'remove:Cow|1148346',
        selected: ['Cow|1148346', 'Cat|923501']
      }
    })
    expect(result.view.context.selectedSummary).toEqual([
      { key: 'Cat|923501', text: 'Cat (01061900) — Felis catus' }
    ])
    expect(result.after).toEqual(result.before)
  })

  it('Should ignore unknown commodity/species pairs in the payload', async () => {
    const result = await driveHandler(post, {
      payload: { species: ['Cow|1148346', 'Wolf|999', 'not-a-key'] }
    })
    expect(result.after.commodityLines).toEqual([
      {
        commoditySelection: 'Cow',
        speciesSelection: '1148346',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      }
    ])
  })
})
