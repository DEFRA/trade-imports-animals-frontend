import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import { store } from '../../../../../../../engine/store.js'
import { flowOnlyAnswersCookie } from '../../../../../../../engine/persistence/session.js'
import {
  driveHandler,
  reviewChangeLinkQuery,
  trailQuery,
  expectBackLinkIsPath,
  withFlowOnlyAnswers,
  expectRemovalRefusedLogged,
  journeyRequest,
  postHandlerEndingWith,
  postHandlerOf,
  errorViewContextFor,
  stubH,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { itSendsBackToWhereTheTraderCameFrom } from '../../../test-support.js'
import { originSaved } from '../../../../../test-support.js'
import { originPage } from '../../origin/page.js'
import { importReasonPage } from '../../import-reason/page.js'
import { dispatchPages } from '../../index.js'
import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import {
  CYA_SLUG,
  TRAIL_START,
  withTrail
} from '../../../../../../../shared/kit.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'

import {
  animalIdentificationPage,
  commoditiesPage,
  consignmentDetailsPage
} from '../page.js'

import * as search from './search.controller.js'
import { lineKey } from './selection/line-key.js'
import { removeActionFor } from './selection/remove-action.js'
import { STORED_SEARCH_ROWS } from './selection/rows.js'
import {
  BISON_BISON_ROW,
  BOS_TAURUS_ROW,
  BUBALUS_BUBALIS,
  CATTLE_HEADING,
  FELIS_CATUS_ROW,
  MUSTELA_PUTORIUS_FURO_ROW
} from './test-support.js'

const get = search.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(search)
const postResults = postHandlerEndingWith(search, `/${search.RESULTS_SLUG}`)

const BISON_BISON_KEY = lineKey(BISON_BISON_ROW)
const BOS_TAURUS_KEY = lineKey(BOS_TAURUS_ROW)
const FELIS_CATUS_KEY = lineKey(FELIS_CATUS_ROW)

const SELECT_COMMODITY = 'Select a commodity'
const UNLISTED_RETURN = 'https://example.test/elsewhere'

const afterSearchShowed = (...rows) =>
  withFlowOnlyAnswers({ [STORED_SEARCH_ROWS]: rows })

const storedSearchRowsOf = (result) =>
  result.cookies[flowOnlyAnswersCookie()][result.journeyId][STORED_SEARCH_ROWS]

const searchFor = (commoditySearch, payload = {}, startingFrom = []) =>
  driveHandler(post, {
    payload: {
      action: 'search',
      [search.SEARCH_FIELD]: commoditySearch,
      ...payload
    },
    startingFrom
  })

const groupsOf = (result) => result.view.context.commodityGroups

const plainTextOf = (html) => {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
  }
  const withoutTags = html
    .split(/[<>]/)
    .filter((_, index) => index % 2 === 0)
    .join('')
  return Object.entries(entities).reduce(
    (text, [entity, char]) => text.replaceAll(entity, char),
    withoutTags
  )
}

const legendsOf = (result) =>
  groupsOf(result).map((group) => plainTextOf(group.legendHtml))

const textsOf = (result) =>
  groupsOf(result).flatMap((group) =>
    group.items.map((item) => plainTextOf(item.html))
  )

const keysOf = (lines) => lines.map(lineKey)

const checkedValuesOf = (result) =>
  groupsOf(result)
    .flatMap((group) => group.items)
    .filter((item) => item.checked)
    .map((item) => item.value)

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

  it('Should group the species a query reaches under their code, each named by its label', async () => {
    const result = await searchFor('buffalo')
    expect(groupsOf(result)).toEqual([
      {
        legendHtml: CATTLE_HEADING,
        items: [
          {
            value: '0102|Bubalus',
            html: 'Bubalus (Water <strong class="govuk-!-font-weight-bold">Buffalo</strong>es)',
            checked: false
          },
          {
            value: `0102|${BUBALUS_BUBALIS}`,
            html: `${BUBALUS_BUBALIS} (Water <strong class="govuk-!-font-weight-bold">Buffalo</strong>)`,
            checked: false
          },
          {
            value: '0102|Syncerus',
            html: 'Syncerus (African <strong class="govuk-!-font-weight-bold">Buffalo</strong>es)',
            checked: false
          }
        ]
      }
    ])
    expect(result.response.statusCode).toBe(200)
    expect(result.view.context.errors).toEqual({})
    expect(result.after).toEqual(result.before)
  })

  it('Should list every species under a code searched for, in species-label order', async () => {
    const result = await searchFor('0102')
    expect(legendsOf(result)).toEqual([CATTLE_HEADING])
    expect(textsOf(result)).toEqual([
      'Bibos spp. (Cattle)',
      'Bison (Bison)',
      'Bison bison (American Bison)',
      'Bison bonasus (European Bison)',
      'Bos (Cattle)',
      'Bos sp. (Cattle)',
      'Bos taurus (Domestic Cattle)',
      'Bubalus (Water Buffaloes)',
      `${BUBALUS_BUBALIS} (Water Buffalo)`,
      'Elephas maximus (Asian Elephant)',
      'Loxodonta africana (African elephant)',
      'Novibos spp. (Cattle)',
      'Ovibos (Muskoxen)',
      'Poephagus spp. (Animals)',
      'Syncerus (African Buffaloes)'
    ])
  })

  it('Should bold the matched text in the commodity heading and in a species label', async () => {
    const headingResult = await searchFor('0102')
    expect(groupsOf(headingResult)[0].legendHtml).toBe(
      'Cattle (<strong class="govuk-!-font-weight-bold">0102</strong>)'
    )

    const labelResult = await searchFor('taurus')
    const bosTaurusItem = groupsOf(labelResult)
      .flatMap((group) => group.items)
      .find((item) => item.value === BOS_TAURUS_KEY)
    expect(bosTaurusItem.html).toBe(
      'Bos <strong class="govuk-!-font-weight-bold">taurus</strong> (Domestic Cattle)'
    )
  })

  it('Should list no more than a hundred species for one search', async () => {
    const result = await searchFor('0106')
    expect(legendsOf(result)).toEqual([
      '01061410',
      '01061490',
      '01061900',
      '01063980'
    ])
    expect(textsOf(result)).toHaveLength(100)
  })

  it('Should reach a species by its common name', async () => {
    const result = await searchFor('ferret')
    expect(legendsOf(result)).toEqual(['01061900'])
    expect(textsOf(result)).toEqual([
      'Mustela putorius furo (Ferret)',
      'Mustela spp. (Weasels (including ermines, polecats, ferrets, and related species))'
    ])
  })

  it('Should say so when a long-enough query matches nothing', async () => {
    const result = await searchFor('zzz')
    expect(groupsOf(result)).toEqual([])
    expect(result.view.context.noResults).toBe(true)
  })
})

describe('commodity search — carried and stored search rows', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should tick a result the trader has already chosen', async () => {
    const bubalis = {
      commodityCode: '0102',
      speciesLatinName: BUBALUS_BUBALIS,
      speciesCommonName: 'Water Buffalo'
    }
    const result = await searchFor('buffalo', { selection: lineKey(bubalis) }, [
      afterSearchShowed(bubalis)
    ])
    expect(checkedValuesOf(result)).toEqual([lineKey(bubalis)])
  })

  it('Should carry a choice made under an earlier query off screen', async () => {
    const result = await searchFor('felis', { selection: BOS_TAURUS_KEY }, [
      afterSearchShowed(BOS_TAURUS_ROW)
    ])
    expect(legendsOf(result)).toEqual(['01061900'])
    expect(result.view.context.carriedKeys).toEqual([BOS_TAURUS_KEY])
  })

  it('Should keep a ticked result off the carried list while it is on screen', async () => {
    const result = await searchFor('felis', { species: FELIS_CATUS_KEY }, [
      afterSearchShowed(FELIS_CATUS_ROW)
    ])
    expect(result.view.context.carriedKeys).toEqual([])
  })

  it('Should drop a result the trader unticked before searching again', async () => {
    const ticked = await searchFor('felis', { species: FELIS_CATUS_KEY }, [
      afterSearchShowed(FELIS_CATUS_ROW)
    ])
    const unticked = await searchFor('felis', {}, [
      afterSearchShowed(FELIS_CATUS_ROW)
    ])
    expect(ticked.view.context.selectedSummary.count).toBe(1)
    expect(unticked.view.context.selectedSummary.count).toBe(0)
  })

  it('Should keep a row an earlier search showed, so a later search cannot lose the choice', async () => {
    const later = await searchFor('felis', {}, [
      afterSearchShowed(BOS_TAURUS_ROW)
    ])
    expect(storedSearchRowsOf(later)).toContainEqual(BOS_TAURUS_ROW)

    const saved = await driveHandler(post, {
      payload: { species: BOS_TAURUS_KEY },
      startingFrom: [
        withFlowOnlyAnswers({ [STORED_SEARCH_ROWS]: storedSearchRowsOf(later) })
      ]
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
      startingFrom: [afterSearchShowed(BOS_TAURUS_ROW)]
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

  it('Should summarise the stored selection, counted, grouped under each commodity heading, each named by its Latin name with a Remove label naming the species and its commodity', async () => {
    const result = await driveHandler(get, {
      seed: {
        commodityLines: [BOS_TAURUS_ROW, BISON_BISON_ROW, FELIS_CATUS_ROW]
      }
    })
    expect(result.view.context.selectedSummary).toEqual({
      count: 3,
      heading: '3 selected',
      groups: [
        {
          legend: CATTLE_HEADING,
          items: [
            {
              label: BISON_BISON_ROW.speciesLatinName,
              removeLabel: `Remove ${BISON_BISON_ROW.speciesLatinName} from ${CATTLE_HEADING}`,
              removeAction: removeActionFor(BISON_BISON_KEY)
            },
            {
              label: BOS_TAURUS_ROW.speciesLatinName,
              removeLabel: `Remove ${BOS_TAURUS_ROW.speciesLatinName} from ${CATTLE_HEADING}`,
              removeAction: removeActionFor(BOS_TAURUS_KEY)
            }
          ]
        },
        {
          legend: '01061900',
          items: [
            {
              label: FELIS_CATUS_ROW.speciesLatinName,
              removeLabel: `Remove ${FELIS_CATUS_ROW.speciesLatinName} from 01061900`,
              removeAction: removeActionFor(FELIS_CATUS_KEY)
            }
          ]
        }
      ]
    })
  })
})

describe('commodity search — removing one chosen species', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should honour a remove naming a species the submitted selection no longer holds, leave the other chosen and log nothing', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: removeActionFor(BOS_TAURUS_KEY),
        [search.SEARCH_FIELD]: 'felis',
        species: FELIS_CATUS_KEY
      },
      startingFrom: [afterSearchShowed(BOS_TAURUS_ROW, FELIS_CATUS_ROW)]
    })
    expect(result.response.statusCode).toBe(200)
    expect(result.view.context.query).toBe('felis')
    expect(result.view.context.selectedSummary.count).toBe(1)
    expect(result.logger.entries).toEqual([])
  })
})

describe.each([
  ['the page', post],
  ['the results', postResults]
])(
  'commodity search — refreshing the selection without saving, posted to %s',
  (_route, handler) => {
    useStubbedJourney(SET_ID, dispatchPages)

    const refresh = (payload, startingFrom) =>
      driveHandler(handler, { payload, startingFrom })

    it("Should store this search's rows beside the rows already shown", async () => {
      const result = await refresh(
        {
          action: 'search',
          [search.SEARCH_FIELD]: 'ferret',
          selection: BOS_TAURUS_KEY
        },
        [afterSearchShowed(BOS_TAURUS_ROW, BISON_BISON_ROW)]
      )
      expect(storedSearchRowsOf(result)).toEqual([
        BOS_TAURUS_ROW,
        BISON_BISON_ROW,
        {
          commodityCode: '01061900',
          speciesLatinName: 'Mustela spp.',
          speciesCommonName:
            'Weasels (including ermines, polecats, ferrets, and related species)'
        },
        {
          commodityCode: '01061900',
          speciesLatinName: 'Mustela putorius furo',
          speciesCommonName: 'Ferret'
        }
      ])
    })

    it('Should empty the summary when the trader clears it, keeping the query', async () => {
      const result = await refresh(
        {
          action: 'clear',
          [search.SEARCH_FIELD]: 'buffalo',
          selection: [BOS_TAURUS_KEY, FELIS_CATUS_KEY]
        },
        [afterSearchShowed(BOS_TAURUS_ROW, FELIS_CATUS_ROW)]
      )
      expect(result.view.context.selectedSummary.count).toBe(0)
      expect(result.view.context.query).toBe('buffalo')
      expect(legendsOf(result)).toEqual([CATTLE_HEADING])
      expect(result.after).toEqual(result.before)
    })

    it('Should remove one chosen species carried off screen, leave the other chosen and keep the query and results on screen', async () => {
      const result = await refresh(
        {
          action: removeActionFor(BOS_TAURUS_KEY),
          [search.SEARCH_FIELD]: 'felis',
          selection: BOS_TAURUS_KEY,
          species: FELIS_CATUS_KEY
        },
        [afterSearchShowed(BOS_TAURUS_ROW, FELIS_CATUS_ROW)]
      )
      expect(result.response.statusCode).toBe(200)
      expect(result.view.context.query).toBe('felis')
      expect(legendsOf(result)).toEqual(['01061900'])
      expect(result.view.context.selectedSummary.count).toBe(1)
      expect(result.after).toEqual(result.before)
    })

    it('Should refuse a remove naming a key the stored search rows never held, store nothing and log one refusal naming the journey and the key', async () => {
      const tamperedKey = '0102|Not a species'
      const result = await refresh(
        { action: removeActionFor(tamperedKey), species: BOS_TAURUS_KEY },
        [afterSearchShowed(BOS_TAURUS_ROW)]
      )
      expect(result.response.output.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
      expect(errorViewContextFor(result.response)).toMatchObject({
        heading: HTTP_STATUS_BAD_REQUEST,
        message: 'There is a problem with your request'
      })
      expectRemovalRefusedLogged(result, {
        reason: 'no-species-for-key',
        key: tamperedKey
      })
      expect(result.after).toEqual(result.before)
    })
  }
)

describe('commodity search — results refreshed in place', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const refreshResults = (payload, startingFrom = []) =>
    driveHandler(postResults, { payload, startingFrom })

  const RESULTS_TEMPLATE =
    'live-animals/journeys/linear/features/commodities/search/search-results'

  it('Should point the page at its results route', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.resultsUrl).toBe(
      pagePath(result.journeyId, search.RESULTS_SLUG)
    )
  })

  it('Should render only the results for a search, ticking what is chosen and carrying the rest', async () => {
    const result = await refreshResults(
      {
        action: 'search',
        [search.SEARCH_FIELD]: 'felis',
        selection: [BOS_TAURUS_KEY, FELIS_CATUS_KEY]
      },
      [afterSearchShowed(BOS_TAURUS_ROW, FELIS_CATUS_ROW)]
    )
    expect(result.view.view).toBe(RESULTS_TEMPLATE)
    expect(Object.keys(result.view.context).sort()).toEqual([
      'announcement',
      'carriedKeys',
      'commodityGroups',
      'copy',
      'noResults',
      'query',
      'selectedSummary'
    ])
    expect(legendsOf(result)).toEqual(['01061900'])
    expect(checkedValuesOf(result)).toEqual([FELIS_CATUS_KEY])
    expect(result.view.context.carriedKeys).toEqual([BOS_TAURUS_KEY])
    expect(result.view.context.selectedSummary.count).toBe(2)
  })

  it('Should announce how many species a search lists', async () => {
    const result = await refreshResults({
      action: 'search',
      [search.SEARCH_FIELD]: 'buffalo'
    })
    expect(result.view.context.announcement).toBe('3 results available')
  })

  it('Should announce a search that lists one species in the singular', async () => {
    const result = await refreshResults({
      action: 'search',
      [search.SEARCH_FIELD]: 'furo'
    })
    expect(result.view.context.announcement).toBe('1 result available')
  })

  it('Should announce a long-enough search that matches nothing', async () => {
    const result = await refreshResults({
      action: 'search',
      [search.SEARCH_FIELD]: 'zzzzzz'
    })
    expect(result.view.context.announcement).toBe('No results found')
  })

  it('Should announce nothing for a query shorter than three characters', async () => {
    const result = await refreshResults({
      action: 'search',
      [search.SEARCH_FIELD]: 'Bo'
    })
    expect(result.view.context.announcement).toBe('')
  })

  it('Should save no commodity lines, even when posted ticks and no action', async () => {
    const result = await refreshResults({ species: BOS_TAURUS_KEY }, [
      afterSearchShowed(BOS_TAURUS_ROW)
    ])
    expect(result.view.view).toBe(RESULTS_TEMPLATE)
    expect(result.view.context.selectedSummary.count).toBe(1)
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
      payload: {
        species: [FELIS_CATUS_KEY, lineKey(MUSTELA_PUTORIUS_FURO_ROW)]
      },
      startingFrom: [
        afterSearchShowed(FELIS_CATUS_ROW, MUSTELA_PUTORIUS_FURO_ROW)
      ]
    })
    expect('containsUnweanedAnimals' in result.after).toBe(false)
    expect(keysOf(result.after.commodityLines)).toEqual([
      FELIS_CATUS_KEY,
      lineKey(MUSTELA_PUTORIUS_FURO_ROW)
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
    expect(legendsOf(result)).toEqual([CATTLE_HEADING])
    expect(result.after).toEqual(result.before)
  })

  it('Should create one line per chosen species in canonical order, with its common name', async () => {
    const result = await driveHandler(post, {
      payload: { species: [FELIS_CATUS_KEY, BOS_TAURUS_KEY, BISON_BISON_KEY] },
      seed: originSaved,
      startingFrom: [
        afterSearchShowed(FELIS_CATUS_ROW, BOS_TAURUS_ROW, BISON_BISON_ROW)
      ]
    })
    expect(result.after.commodityLines).toEqual([
      {
        ...BISON_BISON_ROW,
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      },
      {
        ...BOS_TAURUS_ROW,
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      },
      {
        ...FELIS_CATUS_ROW,
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      }
    ])
    expect(result.response.redirect).toBe(
      withTrail(pagePath(result.journeyId, importReasonPage.slug), [
        commoditiesPage.slug
      ])
    )
  })

  it('Should save what is carried alongside what is ticked on screen', async () => {
    const result = await driveHandler(post, {
      payload: {
        [search.SEARCH_FIELD]: 'felis',
        selection: BOS_TAURUS_KEY,
        species: FELIS_CATUS_KEY
      },
      startingFrom: [afterSearchShowed(BOS_TAURUS_ROW, FELIS_CATUS_ROW)]
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
      payload: {
        species: [BOS_TAURUS_KEY, lineKey(MUSTELA_PUTORIUS_FURO_ROW)]
      },
      startingFrom: [afterSearchShowed(MUSTELA_PUTORIUS_FURO_ROW)]
    })
    expect(result.after.commodityLines).toEqual([
      { ...kept, numberOfAnimalsQuantity: 25 },
      {
        ...MUSTELA_PUTORIUS_FURO_ROW,
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      }
    ])
  })

  it('Should save a species with no common name without a speciesCommonName key', async () => {
    const unnamedRow = {
      commodityCode: '01062000',
      speciesLatinName: 'Otra Testudinata',
      speciesCommonName: null
    }
    const result = await driveHandler(post, {
      payload: { species: lineKey(unnamedRow) },
      startingFrom: [afterSearchShowed(unnamedRow)]
    })
    expect(result.after.commodityLines).toStrictEqual([
      {
        commodityCode: '01062000',
        speciesLatinName: 'Otra Testudinata',
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
      startingFrom: [afterSearchShowed(BOS_TAURUS_ROW)]
    })
    expect(keysOf(result.after.commodityLines)).toEqual([BOS_TAURUS_KEY])
  })
})

describe('commodity search — saving when another page opened the question', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const savedFrom = (
    slug,
    { payload = {}, seed = originSaved, startingFrom = [] } = {}
  ) =>
    driveHandler(post, {
      payload: { species: [FELIS_CATUS_KEY], ...payload },
      query: { return: slug },
      seed,
      startingFrom: [
        afterSearchShowed(FELIS_CATUS_ROW, BOS_TAURUS_ROW),
        ...startingFrom
      ]
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

  it('Should return to the opener carrying the trail', async () => {
    const result = await savedFrom(consignmentDetailsPage.slug, {
      startingFrom: [{ query: reviewChangeLinkQuery() }]
    })
    expect(result.response.redirect).toBe(
      withTrail(pagePath(result.journeyId, consignmentDetailsPage.slug), [
        CYA_SLUG
      ])
    )
  })

  it('Should ignore a return value that names a page not opening the question and redirect as an unmarked save does', async () => {
    const refused = await savedFrom(UNLISTED_RETURN)
    const unmarked = await driveHandler(post, {
      payload: { species: [FELIS_CATUS_KEY] },
      seed: originSaved,
      startingFrom: [afterSearchShowed(FELIS_CATUS_ROW)]
    })
    expect(refused.response.redirect).toBe(
      withTrail(pagePath(refused.journeyId, importReasonPage.slug), [
        commoditiesPage.slug
      ])
    )
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
      seed: originSaved,
      query: marker === null ? {} : { return: marker },
      startingFrom: [afterSearchShowed(FELIS_CATUS_ROW)]
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
          received: UNLISTED_RETURN
        },
        message: 'Return marker not recognised, marker dropped'
      }
    ])
  })

  it('Should log nothing about the question when the save carries no marker', async () => {
    const result = await saveMarked(null)
    expect(result.logger.entries).toEqual([])
  })
})

describe('commodity search — the Back link', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const cameFromOverview = { query: trailQuery(TRAIL_START.overview) }

  it('Should go Back as an unmarked visit does when the return value names a page not opening the question', async () => {
    const refused = await driveHandler(get, {
      query: { return: UNLISTED_RETURN },
      startingFrom: [cameFromOverview]
    })
    const unmarked = await driveHandler(get, {
      startingFrom: [cameFromOverview]
    })
    expect(refused.view.context.backLink).toBe(
      unmarked.view.context.backLink.replace(
        unmarked.journeyId,
        refused.journeyId
      )
    )
  })

  it('Should keep Back on the page saved when the page is shown again by a search', async () => {
    const result = await driveHandler(post, {
      payload: { action: 'search', [search.SEARCH_FIELD]: 'cat' },
      startingFrom: [
        { query: trailQuery(TRAIL_START.overview, originPage.slug) }
      ]
    })
    expectBackLinkIsPath(
      result,
      withTrail(pagePath(result.journeyId, originPage.slug), [
        TRAIL_START.overview
      ])
    )
  })

  it.each([
    ['commodity details', consignmentDetailsPage.slug],
    ['identification details', animalIdentificationPage.slug]
  ])(
    'Should go Back to %s, carrying the trail, when it opened the question',
    async (_opener, openerSlug) => {
      const result = await driveHandler(get, {
        query: { return: openerSlug },
        startingFrom: [cameFromOverview]
      })
      expectBackLinkIsPath(
        result,
        withTrail(pagePath(result.journeyId, openerSlug), [
          TRAIL_START.overview
        ])
      )
    }
  )

  itSendsBackToWhereTheTraderCameFrom(get, { previousPage: originPage.slug })
})
