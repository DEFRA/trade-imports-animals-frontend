import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import * as search from './search.controller.js'

const get = search.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(search)

describe('commodities grouped checklist', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should render all eight pairs grouped by commodity in canonical order', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.commodityGroups).toEqual([
      {
        legend: 'Cow (0102)',
        items: [
          { value: 'Cow|716661', text: 'Bison bison', checked: false },
          { value: 'Cow|1388624', text: 'Bos spp.', checked: false },
          { value: 'Cow|1148346', text: 'Bos taurus', checked: false },
          { value: 'Cow|749313', text: 'Bubalus bubalis', checked: false }
        ]
      },
      {
        legend: 'Horse (0101)',
        items: [
          { value: 'Horse|822332', text: 'Equus caballus', checked: false }
        ]
      },
      {
        legend: 'Cat (01061900)',
        items: [{ value: 'Cat|923501', text: 'Felis catus', checked: false }]
      },
      {
        legend: 'Dog (01061900)',
        items: [
          {
            value: 'Dog|923502',
            text: 'Canis lupus familiaris',
            checked: false
          }
        ]
      },
      {
        legend: 'Fish (0301)',
        items: [{ value: 'Fish|801204', text: 'Salmo salar', checked: false }]
      }
    ])
  })

  it('Should mark stored commodity and species pairs checked', async () => {
    const result = await driveHandler(get, {
      seed: {
        commodityLines: [
          { commoditySelection: 'Cow', speciesSelection: '1148346' },
          { commoditySelection: 'Cat', speciesSelection: '923501' }
        ]
      }
    })
    const items = result.view.context.commodityGroups.flatMap(
      (group) => group.items
    )
    expect(
      items.filter((item) => item.checked).map((item) => item.value)
    ).toEqual(['Cow|1148346', 'Cat|923501'])
  })

  it('Should require at least one checked pair and create nothing', async () => {
    const result = await driveHandler(post, { payload: {} })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.species).toBe('Select a commodity')
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: 'Select a commodity', href: '#species' }
    ])
    expect(result.after).toEqual(result.before)
  })

  it('Should create one line per checked pair in canonical order', async () => {
    const result = await driveHandler(post, {
      payload: { species: ['Cat|923501', 'Cow|716661', 'Cow|1148346'] }
    })
    expect(result.after.commodityLines).toEqual([
      {
        commoditySelection: 'Cow',
        speciesSelection: '716661',
        commodityType: '16',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      },
      {
        commoditySelection: 'Cow',
        speciesSelection: '1148346',
        commodityType: '16',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      },
      {
        commoditySelection: 'Cat',
        speciesSelection: '923501',
        commodityType: '2',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      }
    ])
    expect(result.response.redirect).toContain('consignment-details')
  })

  it("Should preserve a checked line's data and remove an unchecked line", async () => {
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
      payload: { species: ['Cow|1148346', 'Dog|923502'] }
    })
    expect(result.after.commodityLines).toEqual([
      { ...kept, numberOfAnimalsQuantity: 25 },
      {
        commoditySelection: 'Dog',
        speciesSelection: '923502',
        commodityType: '2',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      }
    ])
  })

  it('Should ignore unknown pairs and deduplicate checked pairs', async () => {
    const result = await driveHandler(post, {
      payload: {
        species: ['Cow|1148346', 'Wolf|999', 'Cow|1148346', 'not-a-key']
      }
    })
    expect(
      result.after.commodityLines.map(
        (line) => `${line.commoditySelection}|${line.speciesSelection}`
      )
    ).toEqual(['Cow|1148346'])
  })
})
