import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import { store } from '../../../../../../../engine/store.js'
import { flowOnlyAnswersCookie } from '../../../../../../../engine/persistence/session.js'
import {
  driveHandler,
  expectBackLinkIsPage,
  journeyRequest,
  postHandlerOf,
  stubH,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import { RUN_ACTIVE } from '../../../../../../../flow/run-state.js'

import { animalIdentificationPage, consignmentDetailsPage } from '../page.js'

import * as search from './search.controller.js'
import { lineKey } from './selection/line-key.js'
import { STORED_SEARCH_ROWS } from './selection/rows.js'
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
const UNLISTED_RETURN = 'https://example.test/elsewhere'

const searchRowsShownEarlier = (...rows) => ({ [STORED_SEARCH_ROWS]: rows })

const storedSearchRowsOf = (result) =>
  result.cookies[flowOnlyAnswersCookie()][result.journeyId][STORED_SEARCH_ROWS]

const searchFor = (commoditySearch, payload = {}, flowOnly = undefined) =>
  driveHandler(post, {
    payload: {
      action: 'search',
      [search.SEARCH_FIELD]: commoditySearch,
      ...payload
    },
    flowOnly
  })

const groupsOf = (result) => result.view.context.commodityGroups

const legendsOf = (result) => groupsOf(result).map((group) => group.legend)

const textsOf = (result) =>
  groupsOf(result).flatMap((group) => group.items.map((item) => item.text))

const keysOf = (lines) => lines.map(lineKey)

describe('commodity search', () => {
  useStubbedJourney(SET_ID, dispatchPages)

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
      speciesCommonName: 'Water Buffalo'
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

  it("Should store this search's rows beside the rows already shown", async () => {
    const result = await searchFor(
      'ferret',
      { selection: BOS_TAURUS_KEY },
      searchRowsShownEarlier(BOS_TAURUS_ROW, BISON_BISON_ROW)
    )
    expect(storedSearchRowsOf(result)).toEqual([
      BOS_TAURUS_ROW,
      BISON_BISON_ROW,
      {
        commodityCode: '01061900',
        speciesLatinName: 'Mustela putorius furo',
        speciesCommonName: 'Ferret'
      }
    ])
  })

  it('Should keep a row an earlier search showed, so a later search cannot lose the choice', async () => {
    const later = await searchFor(
      'felis',
      {},
      searchRowsShownEarlier(BOS_TAURUS_ROW)
    )
    expect(storedSearchRowsOf(later)).toContainEqual(BOS_TAURUS_ROW)

    const saved = await driveHandler(post, {
      payload: { species: BOS_TAURUS_KEY },
      flowOnly: { [STORED_SEARCH_ROWS]: storedSearchRowsOf(later) }
    })
    expect(keysOf(saved.after.commodityLines)).toEqual([BOS_TAURUS_KEY])
  })

  it('Should log a choice the stored search rows no longer hold, naming the journey and the key', async () => {
    const journey = await store.create()
    const request = journeyRequest(journey.journeyId, {
      payload: {
        action: 'search',
        [search.SEARCH_FIELD]: 'felis',
        selection: BOS_TAURUS_KEY
      }
    })
    await post(request, stubH(request))

    expect(request.logger.entries).toContainEqual({
      level: 'warn',
      fields: { journeyId: journey.journeyId, droppedKeys: [BOS_TAURUS_KEY] },
      message: 'Commodity choices not in the stored search rows were dropped'
    })
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
  useStubbedJourney(SET_ID, dispatchPages)

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
        [search.SEARCH_FIELD]: 'buffalo',
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
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should require at least one chosen species and create nothing', async () => {
    const result = await driveHandler(post, { payload: {} })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors[search.SEARCH_FIELD]).toBe(
      SELECT_COMMODITY
    )
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_COMMODITY, href: `#${search.SEARCH_FIELD}` }
    ])
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse nothing chosen on Save and return to overview with the same error as Save and continue', async () => {
    const result = await driveHandler(post, { payload: { exit: 'hub' } })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      [search.SEARCH_FIELD]: SELECT_COMMODITY
    })
    expect(result.after).toEqual(result.before)
  })

  it('Should leave the saved selection unchanged when Save and return to overview is refused with nothing chosen', async () => {
    const result = await driveHandler(post, {
      seed: { commodityLines: [BOS_TAURUS_ROW] },
      payload: { exit: 'hub' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      [search.SEARCH_FIELD]: SELECT_COMMODITY
    })
    expect(result.after).toEqual(result.before)
  })

  it('Should clear a saved unweaned answer when the new choice holds only 01061900 species', async () => {
    const result = await driveHandler(post, {
      seed: {
        containsUnweanedAnimals: 'yes',
        commodityLines: [BOS_TAURUS_ROW]
      },
      payload: { species: [FELIS_CATUS_KEY, lineKey(CANIS_FAMILIARIS_ROW)] },
      flowOnly: searchRowsShownEarlier(FELIS_CATUS_ROW, CANIS_FAMILIARIS_ROW)
    })
    expect('containsUnweanedAnimals' in result.after).toBe(false)
    expect(keysOf(result.after.commodityLines)).toEqual([
      lineKey(CANIS_FAMILIARIS_ROW),
      FELIS_CATUS_KEY
    ])
  })

  it('Should key the error to the search box even with results listed, keeping the query and the results', async () => {
    const result = await driveHandler(post, {
      payload: { [search.SEARCH_FIELD]: 'buffalo' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      [search.SEARCH_FIELD]: SELECT_COMMODITY
    })
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_COMMODITY, href: `#${search.SEARCH_FIELD}` }
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
        [search.SEARCH_FIELD]: 'felis',
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

  it('Should save a species with no common name without a speciesCommonName key', async () => {
    const unnamedRow = {
      commodityCode: '01061900',
      speciesLatinName: 'Carnivora excluding Canis familiaris',
      speciesCommonName: null
    }
    const result = await driveHandler(post, {
      payload: { species: lineKey(unnamedRow) },
      flowOnly: searchRowsShownEarlier(unnamedRow)
    })
    expect(result.after.commodityLines).toStrictEqual([
      {
        commodityCode: '01061900',
        speciesLatinName: 'Carnivora excluding Canis familiaris',
        commodityType: '2',
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      }
    ])
  })

  it('Should ignore unknown species and deduplicate chosen species', async () => {
    const result = await driveHandler(post, {
      payload: {
        selection: ['0102|Canis lupus', BOS_TAURUS_KEY],
        species: [BOS_TAURUS_KEY, 'not-a-key']
      },
      flowOnly: searchRowsShownEarlier(BOS_TAURUS_ROW)
    })
    expect(keysOf(result.after.commodityLines)).toEqual([BOS_TAURUS_KEY])
  })
})

describe('commodity search — saving when another page opened the question', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const savedFrom = (slug, { payload = {}, query = {}, seed } = {}) =>
    driveHandler(post, {
      payload: { species: [FELIS_CATUS_KEY], ...payload },
      query: { return: slug, ...query },
      seed,
      flowOnly: searchRowsShownEarlier(FELIS_CATUS_ROW, BOS_TAURUS_ROW)
    })

  it('Should return to commodity details when commodity details opened the question', async () => {
    const result = await savedFrom(consignmentDetailsPage.slug)
    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, consignmentDetailsPage.slug)
    )
  })

  it('Should return to identification details and keep only the commodities left ticked', async () => {
    const cow = {
      ...BOS_TAURUS_ROW,
      numberOfAnimalsQuantity: '4'
    }
    const cat = {
      ...FELIS_CATUS_ROW,
      numberOfAnimalsQuantity: '2'
    }
    const result = await savedFrom(animalIdentificationPage.slug, {
      payload: { species: [BOS_TAURUS_KEY] },
      seed: { commodityLines: [cow, cat] }
    })
    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, animalIdentificationPage.slug)
    )
    expect(keysOf(result.after.commodityLines)).toEqual([BOS_TAURUS_KEY])
  })

  it('Should return to the opener carrying the change context', async () => {
    const result = await savedFrom(consignmentDetailsPage.slug, {
      query: { change: '1' }
    })
    expect(result.response.redirect).toBe(
      `${pagePath(result.journeyId, consignmentDetailsPage.slug)}?change=1`
    )
  })

  it('Should ignore a return value that names a page not opening the question and redirect as an unmarked save does', async () => {
    const refused = await savedFrom(UNLISTED_RETURN)
    const unmarked = await driveHandler(post, {
      payload: { species: [FELIS_CATUS_KEY] },
      flowOnly: searchRowsShownEarlier(FELIS_CATUS_ROW)
    })
    expect(refused.response.redirect).toBe(hubPath(refused.journeyId))
    expect(refused.response.redirect).toBe(
      unmarked.response.redirect.replace(unmarked.journeyId, refused.journeyId)
    )
  })

  it('Should exit to the overview on Save and return to overview whatever opened the question', async () => {
    const result = await savedFrom(consignmentDetailsPage.slug, {
      payload: { exit: 'hub' }
    })
    expect(result.response.redirect).toBe(hubPath(result.journeyId))
  })
})

describe('commodity search — logging a save when another page opened the question', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const saveMarked = (marker) =>
    driveHandler(post, {
      payload: { species: [FELIS_CATUS_KEY] },
      query: marker === undefined ? {} : { return: marker },
      flowOnly: searchRowsShownEarlier(FELIS_CATUS_ROW)
    })

  it('Should log the page returned to once at info when the marker names an opener', async () => {
    const result = await saveMarked(consignmentDetailsPage.slug)
    expect(result.logger.entries).toEqual([
      {
        level: 'info',
        fields: {
          journeyId: result.journeyId,
          honouredReturn: pagePath(
            result.journeyId,
            consignmentDetailsPage.slug
          )
        },
        message:
          'Commodity question saved: returning to the page that opened it'
      }
    ])
  })

  it('Should log the refused marker once at warn when it names a page not opening the question', async () => {
    const result = await saveMarked(UNLISTED_RETURN)
    expect(result.logger.entries).toEqual([
      {
        level: 'warn',
        fields: {
          journeyId: result.journeyId,
          refusedMarker: UNLISTED_RETURN
        },
        message: 'Commodity question return refused: not a page that opens it'
      }
    ])
  })

  it('Should log a refused marker cut to 100 characters', async () => {
    const result = await saveMarked('x'.repeat(300))
    const [entry] = result.logger.entries
    expect(result.logger.entries).toHaveLength(1)
    expect(entry.fields.refusedMarker).toBe('x'.repeat(100))
  })

  it('Should log nothing about the question when the save carries no marker', async () => {
    const result = await saveMarked(undefined)
    expect(result.logger.entries).toEqual([])
  })
})

describe('commodity search — the Back link', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should go Back as an unmarked visit does when the return value names a page not opening the question', async () => {
    const refused = await driveHandler(get, {
      query: { return: UNLISTED_RETURN },
      openingRun: RUN_ACTIVE
    })
    const unmarked = await driveHandler(get, { openingRun: RUN_ACTIVE })
    expect(refused.view.context.backLink).toBe(
      unmarked.view.context.backLink.replace(
        unmarked.journeyId,
        refused.journeyId
      )
    )
  })

  it('Should go Back to the origin of the import while the opening run is on', async () => {
    const result = await driveHandler(get, { openingRun: RUN_ACTIVE })
    expectBackLinkIsPage(result, 'origin')
  })

  it('Should keep Back on the origin of the import when the page is shown again by a search in the run', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'search', [search.SEARCH_FIELD]: 'cat' },
      openingRun: RUN_ACTIVE
    })
    expectBackLinkIsPage(result, 'origin')
  })

  it('Should go Back to the overview when the page is opened from the overview', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })

  it('Should go Back to commodity details when commodity details opened the question', async () => {
    const result = await driveHandler(get, {
      query: { return: consignmentDetailsPage.slug },
      openingRun: RUN_ACTIVE
    })
    expectBackLinkIsPage(result, consignmentDetailsPage.slug)
  })

  it('Should go Back to identification details when identification details opened the question', async () => {
    const result = await driveHandler(get, {
      query: { return: animalIdentificationPage.slug },
      openingRun: RUN_ACTIVE
    })
    expectBackLinkIsPage(result, animalIdentificationPage.slug)
  })

  it('Should carry the change context on the Back link to the opener', async () => {
    const result = await driveHandler(get, {
      query: { return: consignmentDetailsPage.slug, change: '1' },
      openingRun: RUN_ACTIVE
    })
    expect(result.view.context.backLink).toBe(
      `${pagePath(result.journeyId, consignmentDetailsPage.slug)}?change=1`
    )
  })
})
