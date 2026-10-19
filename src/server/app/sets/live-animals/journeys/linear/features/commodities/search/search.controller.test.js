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

const get = search.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(search)

// Rows as the saved TST data holds them.
const BISON_BISON = {
  code: '0102',
  latinName: 'Bison bison',
  commonName: 'Bisons Spp'
}
const BOS_TAURUS = {
  code: '0102',
  latinName: 'Bos taurus',
  commonName: 'Cattle or Cow'
}
const FELIS_CATUS = {
  code: '01061900',
  latinName: 'Felis catus',
  commonName: 'Domestic Cat'
}
const CANIS_FAMILIARIS = {
  code: '01061900',
  latinName: 'Canis familiaris',
  commonName: 'Dog'
}

const keyOf = (row) => `${row.code}|${row.latinName}`

const BISON_BISON_KEY = keyOf(BISON_BISON)
const BOS_TAURUS_KEY = keyOf(BOS_TAURUS)
const FELIS_CATUS_KEY = keyOf(FELIS_CATUS)

const SELECT_COMMODITY = 'Select a commodity'

// The rows earlier searches showed, held in the session until the page saves.
const shown = (...rows) => ({ commoditySearchRows: rows })

const searchFor = (commoditySearch, payload = {}, flowOnly = undefined) =>
  driveHandler(post, {
    payload: { action: 'search', commoditySearch, ...payload },
    flowOnly
  })

const groupsOf = (result) => result.view.context.commodityGroups

const legendsOf = (result) => groupsOf(result).map((group) => group.legend)

const textsOf = (result) =>
  groupsOf(result).flatMap((group) => group.items.map((item) => item.text))

const keysOf = (lines) =>
  lines.map((line) => `${line.commoditySelection}|${line.speciesSelection}`)

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

  it('Should list no more than ten species for one search', async () => {
    const result = await searchFor('0102')
    expect(legendsOf(result)).toEqual(['0102'])
    expect(textsOf(result)).toHaveLength(10)
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
      code: '0102',
      latinName: 'Bubalus bubalis',
      commonName: 'Water Buffalo'
    }
    const result = await searchFor(
      'buffalo',
      { selection: keyOf(bubalis) },
      shown(bubalis)
    )
    const items = groupsOf(result).flatMap((group) => group.items)
    expect(
      items.filter((item) => item.checked).map((item) => item.value)
    ).toEqual([keyOf(bubalis)])
  })

  it('Should carry a choice made under an earlier query off screen', async () => {
    const result = await searchFor(
      'felis',
      { selection: BOS_TAURUS_KEY },
      shown(BOS_TAURUS)
    )
    expect(legendsOf(result)).toEqual(['01061900'])
    expect(result.view.context.carriedKeys).toEqual([BOS_TAURUS_KEY])
  })

  it('Should keep a ticked result off the carried list while it is on screen', async () => {
    const result = await searchFor(
      'felis',
      { species: FELIS_CATUS_KEY },
      shown(FELIS_CATUS)
    )
    expect(result.view.context.carriedKeys).toEqual([])
  })

  it('Should drop a result the trader unticked before searching again', async () => {
    const ticked = await searchFor(
      'felis',
      { species: FELIS_CATUS_KEY },
      shown(FELIS_CATUS)
    )
    const unticked = await searchFor('felis', {}, shown(FELIS_CATUS))
    expect(ticked.view.context.selectedSummary.count).toBe(1)
    expect(unticked.view.context.selectedSummary.count).toBe(0)
  })

  it('Should remember the rows it showed and the rows already chosen until the page saves', async () => {
    const result = await searchFor(
      'ferret',
      { selection: BOS_TAURUS_KEY },
      shown(BOS_TAURUS, BISON_BISON)
    )
    expect(
      result.cookies[flowOnlyAnswersCookie()][result.journeyId]
        .commoditySearchRows
    ).toEqual([
      BOS_TAURUS,
      {
        code: '01061900',
        latinName: 'Mustela putorius furo',
        commonName: 'Ferret'
      }
    ])
  })

  it('Should forget the rows once the page has saved its lines', async () => {
    const result = await driveHandler(post, {
      payload: { species: BOS_TAURUS_KEY },
      flowOnly: shown(BOS_TAURUS)
    })
    expect(
      result.cookies[flowOnlyAnswersCookie()][result.journeyId]
        .commoditySearchRows
    ).toEqual([])
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
            commoditySelection: '0102',
            speciesSelection: BOS_TAURUS.latinName
          },
          {
            commoditySelection: '0102',
            speciesSelection: BISON_BISON.latinName
          },
          {
            commoditySelection: '01061900',
            speciesSelection: FELIS_CATUS.latinName
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
          items: [BISON_BISON.latinName, BOS_TAURUS.latinName]
        },
        { legend: '01061900', items: [FELIS_CATUS.latinName] }
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
      flowOnly: shown(BOS_TAURUS, FELIS_CATUS)
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
      flowOnly: shown(FELIS_CATUS, BOS_TAURUS, BISON_BISON)
    })
    expect(result.after.commodityLines).toEqual([
      {
        commoditySelection: '0102',
        speciesSelection: BISON_BISON.latinName,
        commonName: 'Bisons Spp',
        commodityType: '16',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      },
      {
        commoditySelection: '0102',
        speciesSelection: BOS_TAURUS.latinName,
        commonName: BOS_TAURUS.commonName,
        commodityType: '16',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      },
      {
        commoditySelection: '01061900',
        speciesSelection: FELIS_CATUS.latinName,
        commonName: 'Domestic Cat',
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
      flowOnly: shown(BOS_TAURUS, FELIS_CATUS)
    })
    expect(keysOf(result.after.commodityLines)).toEqual([
      BOS_TAURUS_KEY,
      FELIS_CATUS_KEY
    ])
  })

  it("Should preserve a chosen line's data and remove one that is gone", async () => {
    const kept = {
      commoditySelection: '0102',
      speciesSelection: BOS_TAURUS.latinName,
      commonName: BOS_TAURUS.commonName,
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25',
      animalIdentifiers: [{ animalIdentifierEarTag: 'UK123456789012' }]
    }
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          kept,
          {
            commoditySelection: '01061900',
            speciesSelection: FELIS_CATUS.latinName,
            numberOfAnimalsQuantity: '2'
          }
        ]
      },
      payload: { species: [BOS_TAURUS_KEY, keyOf(CANIS_FAMILIARIS)] },
      flowOnly: shown(CANIS_FAMILIARIS)
    })
    expect(result.after.commodityLines).toEqual([
      { ...kept, numberOfAnimalsQuantity: 25 },
      {
        commoditySelection: '01061900',
        speciesSelection: 'Canis familiaris',
        commonName: 'Dog',
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
      flowOnly: shown(BOS_TAURUS)
    })
    expect(keysOf(result.after.commodityLines)).toEqual([BOS_TAURUS_KEY])
  })
})
