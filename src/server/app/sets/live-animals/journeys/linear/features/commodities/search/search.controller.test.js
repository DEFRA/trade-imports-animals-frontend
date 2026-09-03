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

const COW_BISON_KEY = 'Cow|716661'
const COW_BOS_TAURUS_KEY = 'Cow|1148346'
const CAT_FELIS_CATUS_KEY = 'Cat|923501'

const COW_LEGEND = 'Cow (0102)'
const CAT_LEGEND = 'Cat (01061900)'
const BOS_TAURUS = 'Bos taurus'
const SELECT_COMMODITY = 'Select a commodity'

const searchFor = (commoditySearch, payload = {}) =>
  driveHandler(post, {
    payload: { action: 'search', commoditySearch, ...payload }
  })

const groupsOf = (result) => result.view.context.commodityGroups

const legendsOf = (result) => groupsOf(result).map((group) => group.legend)

const textsOf = (result) =>
  groupsOf(result).flatMap((group) => group.items.map((item) => item.text))

describe('commodity search', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should list nothing until the page is searched', async () => {
    const result = await driveHandler(get)
    expect(groupsOf(result)).toEqual([])
    expect(result.view.context.noResults).toBe(false)
    expect(result.view.context.query).toBe('')
  })

  it('Should list nothing for a query shorter than three characters', async () => {
    const result = await searchFor('Bo')
    expect(groupsOf(result)).toEqual([])
    expect(result.view.context.noResults).toBe(false)
    expect(result.response.statusCode).toBe(200)
    expect(result.view.context.errors).toEqual({})
    expect(result.after).toEqual(result.before)
  })

  it('Should group the species a species-name query reaches under their commodity', async () => {
    const result = await searchFor('Bos')
    expect(groupsOf(result)).toEqual([
      {
        legend: COW_LEGEND,
        items: [
          { value: 'Cow|1388624', text: 'Bos spp.', checked: false },
          { value: COW_BOS_TAURUS_KEY, text: BOS_TAURUS, checked: false }
        ]
      }
    ])
    expect(result.response.statusCode).toBe(200)
    expect(result.view.context.errors).toEqual({})
    expect(result.after).toEqual(result.before)
  })

  it('Should return every species of a commodity its name matches', async () => {
    const result = await searchFor('Cow')
    expect(legendsOf(result)).toEqual([COW_LEGEND])
    expect(textsOf(result)).toEqual([
      'Bison bison',
      'Bos spp.',
      BOS_TAURUS,
      'Bubalus bubalis'
    ])
  })

  it('Should match a commodity code on its leading digits', async () => {
    const result = await searchFor('0106')
    expect(legendsOf(result)).toEqual([CAT_LEGEND, 'Dog (01061900)'])
  })

  it('Should say so when a long-enough query matches nothing', async () => {
    const result = await searchFor('zzz')
    expect(groupsOf(result)).toEqual([])
    expect(result.view.context.noResults).toBe(true)
  })

  it('Should tick a result the trader has already chosen', async () => {
    const result = await searchFor('Bos', { selection: COW_BOS_TAURUS_KEY })
    const items = groupsOf(result).flatMap((group) => group.items)
    expect(
      items.filter((item) => item.checked).map((item) => item.value)
    ).toEqual([COW_BOS_TAURUS_KEY])
  })

  it('Should carry a choice made under an earlier query off screen', async () => {
    const result = await searchFor('Felis', { selection: COW_BOS_TAURUS_KEY })
    expect(legendsOf(result)).toEqual([CAT_LEGEND])
    expect(result.view.context.carriedKeys).toEqual([COW_BOS_TAURUS_KEY])
  })

  it('Should keep a ticked result off the carried list while it is on screen', async () => {
    const result = await searchFor('Bos', { species: COW_BOS_TAURUS_KEY })
    expect(result.view.context.carriedKeys).toEqual([])
  })

  it('Should drop a result the trader unticked before searching again', async () => {
    const ticked = await searchFor('Bos', { species: COW_BOS_TAURUS_KEY })
    const unticked = await searchFor('Bos')
    expect(ticked.view.context.selectedSummary.count).toBe(1)
    expect(unticked.view.context.selectedSummary.count).toBe(0)
  })
})

describe('commodity search — what has been chosen so far', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should summarise the stored selection, counted and grouped', async () => {
    const result = await driveHandler(get, {
      seed: {
        commodityLines: [
          { commoditySelection: 'Cow', speciesSelection: '1148346' },
          { commoditySelection: 'Cow', speciesSelection: '716661' },
          { commoditySelection: 'Cat', speciesSelection: '923501' }
        ]
      }
    })
    expect(result.view.context.selectedSummary).toEqual({
      count: 3,
      heading: '3 selected',
      groups: [
        { legend: COW_LEGEND, items: ['Bison bison', BOS_TAURUS] },
        { legend: CAT_LEGEND, items: ['Felis catus'] }
      ]
    })
  })

  it('Should empty the summary when the trader clears it, keeping the query', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'clear',
        commoditySearch: 'Bos',
        selection: [COW_BOS_TAURUS_KEY, CAT_FELIS_CATUS_KEY]
      }
    })
    expect(result.view.context.selectedSummary.count).toBe(0)
    expect(result.view.context.query).toBe('Bos')
    expect(legendsOf(result)).toEqual([COW_LEGEND])
    expect(result.after).toEqual(result.before)
  })
})

describe('commodity search — saving the selection', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should require at least one chosen pair and create nothing', async () => {
    const result = await driveHandler(post, { payload: {} })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.commoditySearch).toBe(SELECT_COMMODITY)
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_COMMODITY, href: '#commoditySearch' }
    ])
    expect(result.after).toEqual(result.before)
  })

  it('Should key the error to the tick boxes, keeping the query and the results', async () => {
    const result = await driveHandler(post, {
      payload: { commoditySearch: 'Bos' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.species).toBe(SELECT_COMMODITY)
    expect(result.view.context.errors.commoditySearch).toBeUndefined()
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_COMMODITY, href: '#species' }
    ])
    expect(result.view.context.query).toBe('Bos')
    expect(legendsOf(result)).toEqual([COW_LEGEND])
    expect(result.after).toEqual(result.before)
  })

  it('Should create one line per chosen pair in canonical order', async () => {
    const result = await driveHandler(post, {
      payload: {
        species: [CAT_FELIS_CATUS_KEY, COW_BISON_KEY, COW_BOS_TAURUS_KEY]
      }
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

  it('Should save what is carried alongside what is ticked on screen', async () => {
    const result = await driveHandler(post, {
      payload: {
        commoditySearch: 'Felis',
        selection: COW_BOS_TAURUS_KEY,
        species: CAT_FELIS_CATUS_KEY
      }
    })
    expect(
      result.after.commodityLines.map(
        (line) => `${line.commoditySelection}|${line.speciesSelection}`
      )
    ).toEqual([COW_BOS_TAURUS_KEY, CAT_FELIS_CATUS_KEY])
  })

  it("Should preserve a chosen line's data and remove one that is gone", async () => {
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
      payload: { species: [COW_BOS_TAURUS_KEY, 'Dog|923502'] }
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

  it('Should ignore unknown pairs and deduplicate chosen pairs', async () => {
    const result = await driveHandler(post, {
      payload: {
        selection: ['Wolf|999', COW_BOS_TAURUS_KEY],
        species: [COW_BOS_TAURUS_KEY, 'not-a-key']
      }
    })
    expect(
      result.after.commodityLines.map(
        (line) => `${line.commoditySelection}|${line.speciesSelection}`
      )
    ).toEqual([COW_BOS_TAURUS_KEY])
  })
})
