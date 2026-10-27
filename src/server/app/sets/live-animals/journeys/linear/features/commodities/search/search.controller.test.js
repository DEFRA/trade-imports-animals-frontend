import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  expectBackLinkIsPage,
  postHandlerOf,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import { RUN_ACTIVE } from '../../../../../../../flow/run-state.js'

import { animalIdentificationPage, consignmentDetailsPage } from '../page.js'

import * as search from './search.controller.js'

const get = search.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(search)

const COW_BISON_KEY = 'Cow|716661'
const COW_BOS_TAURUS_KEY = 'Cow|1148346'
const CAT_FELIS_CATUS_KEY = 'Cat|923501'

const COW_LEGEND = 'Cow (0102)'
const CAT_LEGEND = 'Cat (01061900)'
const BISON_BISON = 'American bison (Bison bison)'
const BOS_SPP = 'Cattle (Bos spp.)'
const BOS_TAURUS = 'Domestic cattle (Bos taurus)'
const BUBALUS_BUBALIS = 'Water buffalo (Bubalus bubalis)'
const FELIS_CATUS = 'Cat (Felis catus)'
const SELECT_COMMODITY = 'Select a commodity'
const UNLISTED_RETURN = 'https://example.test/elsewhere'

const searchFor = (commoditySearch, payload = {}) =>
  driveHandler(post, {
    payload: {
      action: 'search',
      [search.SEARCH_FIELD]: commoditySearch,
      ...payload
    }
  })

const groupsOf = (result) => result.view.context.commodityGroups

const legendsOf = (result) => groupsOf(result).map((group) => group.legend)

const textsOf = (result) =>
  groupsOf(result).flatMap((group) => group.items.map((item) => item.text))

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

  it('Should group the species a species-name query reaches under their commodity', async () => {
    const result = await searchFor('Bos')
    expect(groupsOf(result)).toEqual([
      {
        legend: COW_LEGEND,
        items: [
          { value: 'Cow|1388624', text: BOS_SPP, checked: false },
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
      BISON_BISON,
      BOS_SPP,
      BOS_TAURUS,
      BUBALUS_BUBALIS
    ])
  })

  it('Should label a species with its common name and its scientific name', async () => {
    const result = await searchFor('Salmo')
    expect(textsOf(result)).toEqual(['Atlantic salmon (Salmo salar)'])
  })

  it('Should reach a species by its common name', async () => {
    const result = await searchFor('cattle')
    expect(legendsOf(result)).toEqual([COW_LEGEND])
    expect(textsOf(result)).toEqual([BOS_SPP, BOS_TAURUS])
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
  useStubbedJourney(SET_ID, dispatchPages)

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
        { legend: COW_LEGEND, items: [BISON_BISON, BOS_TAURUS] },
        { legend: CAT_LEGEND, items: [FELIS_CATUS] }
      ]
    })
  })

  it('Should empty the summary when the trader clears it, keeping the query', async () => {
    const result = await driveHandler(post, {
      payload: {
        action: 'clear',
        [search.SEARCH_FIELD]: 'Bos',
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
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should require at least one chosen pair and create nothing', async () => {
    const result = await driveHandler(post, { payload: {} })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors[search.SEARCH_FIELD]).toBe(
      SELECT_COMMODITY
    )
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_COMMODITY, href: `#${search.SEARCH_FIELD}` }
    ])
    expect(result.after).toEqual(result.before)
    expect(result.logger.entries).toEqual([])
  })

  it('Should refuse nothing chosen on Save and return to overview with the same error as Save and continue', async () => {
    const result = await driveHandler(post, { payload: { exit: 'hub' } })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      [search.SEARCH_FIELD]: SELECT_COMMODITY
    })
    expect(result.after).toEqual(result.before)
    expect(result.logger.entries).toEqual([])
  })

  it('Should leave the saved selection unchanged when Save and return to overview is refused with nothing chosen', async () => {
    const seed = {
      commodityLines: [
        { commoditySelection: 'Cow', speciesSelection: '1148346' }
      ]
    }
    const result = await driveHandler(post, { seed, payload: { exit: 'hub' } })
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
        commodityLines: [
          { commoditySelection: 'Cow', speciesSelection: '1148346' }
        ]
      },
      payload: { species: [CAT_FELIS_CATUS_KEY, 'Dog|923502'] }
    })
    expect('containsUnweanedAnimals' in result.after).toBe(false)
    expect(
      result.after.commodityLines.map((line) => line.commoditySelection)
    ).toEqual(['Cat', 'Dog'])
  })

  it('Should key the error to the search box even with results listed, keeping the query and the results', async () => {
    const result = await driveHandler(post, {
      payload: { [search.SEARCH_FIELD]: 'Bos' }
    })
    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      [search.SEARCH_FIELD]: SELECT_COMMODITY
    })
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_COMMODITY, href: `#${search.SEARCH_FIELD}` }
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
    expect(result.response.redirect).toMatch(/\/notifications\/[^/]+$/)
  })

  it('Should save what is carried alongside what is ticked on screen', async () => {
    const result = await driveHandler(post, {
      payload: {
        [search.SEARCH_FIELD]: 'Felis',
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

describe('commodity search — saving when another page opened the question', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const savedFrom = (slug, { payload = {}, query = {}, seed } = {}) =>
    driveHandler(post, {
      payload: { species: [CAT_FELIS_CATUS_KEY], ...payload },
      query: { return: slug, ...query },
      seed
    })

  it('Should return to commodity details when commodity details opened the question', async () => {
    const result = await savedFrom(consignmentDetailsPage.slug)
    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, consignmentDetailsPage.slug)
    )
  })

  it('Should return to identification details and keep only the commodities left ticked', async () => {
    const cow = {
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
      numberOfAnimalsQuantity: '4'
    }
    const cat = {
      commoditySelection: 'Cat',
      speciesSelection: '923501',
      numberOfAnimalsQuantity: '2'
    }
    const result = await savedFrom(animalIdentificationPage.slug, {
      payload: { species: [COW_BOS_TAURUS_KEY] },
      seed: { commodityLines: [cow, cat] }
    })
    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, animalIdentificationPage.slug)
    )
    expect(
      result.after.commodityLines.map(
        (line) => `${line.commoditySelection}|${line.speciesSelection}`
      )
    ).toEqual([COW_BOS_TAURUS_KEY])
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
      payload: { species: [CAT_FELIS_CATUS_KEY] }
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
      payload: { species: [CAT_FELIS_CATUS_KEY] },
      query: marker === undefined ? {} : { return: marker }
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
})
