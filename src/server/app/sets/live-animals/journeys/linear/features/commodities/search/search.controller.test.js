import { SET_ID } from '../../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import {
  configureSession,
  flowOnlyAnswersCookie
} from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { hubPath } from '../../../../../../../shared/paths.js'

import * as search from './search.controller.js'
import { lineKey } from './selection/line-key.js'
import { SHOWN_SEARCH_ROWS } from './selection/rows.js'
import {
  BISON_BISON_ROW,
  BOS_TAURUS_ROW,
  CANIS_FAMILIARIS_ROW,
  FELIS_CATUS_ROW
} from './test-support.js'

const get = search.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(search)

const BISON_BISON_KEY = lineKey(BISON_BISON_ROW)
const BOS_TAURUS_KEY = lineKey(BOS_TAURUS_ROW)
const FELIS_CATUS_KEY = lineKey(FELIS_CATUS_ROW)

const SELECT_COMMODITY = 'Select a commodity'

const searchRowsShownEarlier = (...rows) => ({ [SHOWN_SEARCH_ROWS]: rows })

const storedSearchRowsOf = (result) =>
  result.cookies[flowOnlyAnswersCookie()][result.journeyId][SHOWN_SEARCH_ROWS]

const searchFor = (commoditySearch, payload = {}, flowOnly = undefined) =>
  driveHandler(post, {
    payload: { action: 'search', commoditySearch, ...payload },
    flowOnly
  })

const groupsOf = (result) => result.view.context.commodityGroups

const legendsOf = (result) => groupsOf(result).map((group) => group.legend)

const textsOf = (result) =>
  groupsOf(result).flatMap((group) => group.items.map((item) => item.text))

const keysOf = (lines) => lines.map(lineKey)

describe('commodity search', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
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

  it('Should group the species a query reaches under their code, each named by its scientific name', async () => {
    const result = await searchFor('buffalo')
    expect(groupsOf(result)).toEqual([
      {
        legend: '0102',
        items: [
          { value: '0102|Bubalus', text: 'Bubalus', checked: false },
          {
            value: '0102|Bubalus bubalis',
            text: 'Bubalus bubalis',
            checked: false
          },
          { value: '0102|Syncerus', text: 'Syncerus', checked: false }
        ]
      }
    ])
    expect(result.response.statusCode).toBe(200)
    expect(result.view.context.errors).toEqual({})
    expect(result.after).toEqual(result.before)
  })

  it('Should list every species under a code searched for', async () => {
    const result = await searchFor('0102')
    expect(legendsOf(result)).toEqual(['0102'])
    expect(textsOf(result)).toHaveLength(15)
    expect(textsOf(result)).toContain('Bison bison')
  })

  it('Should list no more than a hundred species for one search', async () => {
    const result = await searchFor('01061900')
    expect(legendsOf(result)).toEqual(['01061900'])
    expect(textsOf(result)).toHaveLength(100)
  })

  it('Should reach a species by its common name', async () => {
    const result = await searchFor('ferret')
    expect(legendsOf(result)).toEqual(['01061900'])
    expect(textsOf(result)).toEqual(['Mustela putorius furo'])
  })

  it('Should say so when a long-enough query matches nothing', async () => {
    const result = await searchFor('zzz')
    expect(groupsOf(result)).toEqual([])
    expect(result.view.context.noResults).toBe(true)
  })

  it('Should tick a result the trader has already chosen', async () => {
    const bubalis = {
      commodityCode: '0102',
      speciesLatinName: 'Bubalus bubalis',
      commonName: 'Water Buffalo'
    }
    const result = await searchFor(
      'buffalo',
      { selection: lineKey(bubalis) },
      searchRowsShownEarlier(bubalis)
    )
    const items = groupsOf(result).flatMap((group) => group.items)
    expect(
      items.filter((item) => item.checked).map((item) => item.value)
    ).toEqual([lineKey(bubalis)])
  })

  it('Should carry a choice made under an earlier query off screen', async () => {
    const result = await searchFor(
      'felis',
      { selection: BOS_TAURUS_KEY },
      searchRowsShownEarlier(BOS_TAURUS_ROW)
    )
    expect(legendsOf(result)).toEqual(['01061900'])
    expect(result.view.context.carriedKeys).toEqual([BOS_TAURUS_KEY])
  })

  it('Should keep a ticked result off the carried list while it is on screen', async () => {
    const result = await searchFor(
      'felis',
      { species: FELIS_CATUS_KEY },
      searchRowsShownEarlier(FELIS_CATUS_ROW)
    )
    expect(result.view.context.carriedKeys).toEqual([])
  })

  it('Should drop a result the trader unticked before searching again', async () => {
    const ticked = await searchFor(
      'felis',
      { species: FELIS_CATUS_KEY },
      searchRowsShownEarlier(FELIS_CATUS_ROW)
    )
    const unticked = await searchFor(
      'felis',
      {},
      searchRowsShownEarlier(FELIS_CATUS_ROW)
    )
    expect(ticked.view.context.selectedSummary.count).toBe(1)
    expect(unticked.view.context.selectedSummary.count).toBe(0)
  })

  it('Should remember the rows it showed and the rows already chosen until the page saves', async () => {
    const result = await searchFor(
      'ferret',
      { selection: BOS_TAURUS_KEY },
      searchRowsShownEarlier(BOS_TAURUS_ROW, BISON_BISON_ROW)
    )
    expect(storedSearchRowsOf(result)).toEqual([
      BOS_TAURUS_ROW,
      {
        commodityCode: '01061900',
        speciesLatinName: 'Mustela putorius furo',
        commonName: 'Ferret'
      }
    ])
  })

  it('Should forget the rows once the page has saved its lines', async () => {
    const result = await driveHandler(post, {
      payload: { species: BOS_TAURUS_KEY },
      flowOnly: searchRowsShownEarlier(BOS_TAURUS_ROW)
    })
    expect(storedSearchRowsOf(result)).toEqual([])
  })

  it('Should ignore a choice the page was never shown', async () => {
    const result = await searchFor('felis', { selection: BOS_TAURUS_KEY })
    expect(result.view.context.carriedKeys).toEqual([])
    expect(result.view.context.selectedSummary.count).toBe(0)
  })
})

describe('commodity search — what has been chosen so far', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should summarise the stored selection, counted and grouped by code', async () => {
    const result = await driveHandler(get, {
      seed: {
        commodityLines: [
          {
            commodityCode: '0102',
            speciesLatinName: BOS_TAURUS_ROW.speciesLatinName
          },
          {
            commodityCode: '0102',
            speciesLatinName: BISON_BISON_ROW.speciesLatinName
          },
          {
            commodityCode: '01061900',
            speciesLatinName: FELIS_CATUS_ROW.speciesLatinName
          }
        ]
      }
    })
    expect(result.view.context.selectedSummary).toEqual({
      count: 3,
      heading: '3 selected',
      groups: [
        {
          legend: '0102',
          items: [
            BISON_BISON_ROW.speciesLatinName,
            BOS_TAURUS_ROW.speciesLatinName
          ]
        },
        { legend: '01061900', items: [FELIS_CATUS_ROW.speciesLatinName] }
      ]
    })
  })

  it('Should empty the summary when the trader clears it, keeping the query', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'clear',
        commoditySearch: 'buffalo',
        selection: [BOS_TAURUS_KEY, FELIS_CATUS_KEY]
      },
      flowOnly: searchRowsShownEarlier(BOS_TAURUS_ROW, FELIS_CATUS_ROW)
    })
    expect(result.view.context.selectedSummary.count).toBe(0)
    expect(result.view.context.query).toBe('buffalo')
    expect(legendsOf(result)).toEqual(['0102'])
    expect(result.after).toEqual(result.before)
  })
})

describe('commodity search — saving the selection', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
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

  it('Should go to the overview with nothing chosen on Save and return to overview', async () => {
    const result = await driveHandler(post, { payload: { exit: 'hub' } })
    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.view).toBeUndefined()
    expect(result.after.commodityLines ?? []).toEqual([])
  })

  it('Should key the error to the tick boxes, keeping the query and the results', async () => {
    const result = await driveHandler(post, {
      payload: { commoditySearch: 'buffalo' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.species).toBe(SELECT_COMMODITY)
    expect(result.view.context.errors.commoditySearch).toBeUndefined()
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_COMMODITY, href: '#species' }
    ])
    expect(result.view.context.query).toBe('buffalo')
    expect(legendsOf(result)).toEqual(['0102'])
    expect(result.after).toEqual(result.before)
  })

  it('Should create one line per chosen species in canonical order, with its common name', async () => {
    const result = await driveHandler(post, {
      payload: { species: [FELIS_CATUS_KEY, BOS_TAURUS_KEY, BISON_BISON_KEY] },
      flowOnly: searchRowsShownEarlier(
        FELIS_CATUS_ROW,
        BOS_TAURUS_ROW,
        BISON_BISON_ROW
      )
    })
    expect(result.after.commodityLines).toEqual([
      {
        ...BISON_BISON_ROW,
        commodityType: '16',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      },
      {
        ...BOS_TAURUS_ROW,
        commodityType: '16',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      },
      {
        ...FELIS_CATUS_ROW,
        commodityType: '2',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      }
    ])
    expect(result.response.redirect).toMatch(/\/notifications\/[^/]+$/)
  })

  it('Should save what is carried alongside what is ticked on screen', async () => {
    const result = await driveHandler(post, {
      payload: {
        commoditySearch: 'felis',
        selection: BOS_TAURUS_KEY,
        species: FELIS_CATUS_KEY
      },
      flowOnly: searchRowsShownEarlier(BOS_TAURUS_ROW, FELIS_CATUS_ROW)
    })
    expect(keysOf(result.after.commodityLines)).toEqual([
      BOS_TAURUS_KEY,
      FELIS_CATUS_KEY
    ])
  })

  it("Should preserve a chosen line's data and remove one that is gone", async () => {
    const kept = {
      ...BOS_TAURUS_ROW,
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
    }
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          kept,
          {
            commodityCode: '01061900',
            speciesLatinName: FELIS_CATUS_ROW.speciesLatinName,
            numberOfAnimalsQuantity: '2'
          }
        ]
      },
      payload: { species: [BOS_TAURUS_KEY, lineKey(CANIS_FAMILIARIS_ROW)] },
      flowOnly: searchRowsShownEarlier(CANIS_FAMILIARIS_ROW)
    })
    expect(result.after.commodityLines).toEqual([
      { ...kept, numberOfAnimalsQuantity: 25 },
      {
        ...CANIS_FAMILIARIS_ROW,
        commodityType: '2',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      }
    ])
  })

  it('Should ignore unknown pairs and deduplicate chosen pairs', async () => {
    const result = await driveHandler(post, {
      payload: {
        selection: ['Wolf|999', BOS_TAURUS_KEY],
        species: [BOS_TAURUS_KEY, 'not-a-key']
      },
      flowOnly: searchRowsShownEarlier(BOS_TAURUS_ROW)
    })
    expect(keysOf(result.after.commodityLines)).toEqual([BOS_TAURUS_KEY])
  })
})
