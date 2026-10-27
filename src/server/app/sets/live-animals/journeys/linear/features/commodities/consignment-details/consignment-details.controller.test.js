import { SET_BASE, SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import { RUN_ACTIVE } from '../../../../../../../flow/run-state.js'
import { store } from '../../../../../../../engine/store.js'
import {
  crumbProtectedServerMounting,
  driveHandler,
  expectBackLinkIsPage,
  expectNoRefusalLogged,
  expectRemovalRefusedLogged,
  postHandlerOf,
  journeyRequest,
  stubH,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import { dispatchPages } from '../../index.js'
import { consignmentDetailsPage } from '../page.js'

import * as consignmentDetails from './consignment-details.controller.js'
import {
  BISON_BISON,
  BOS_TAURUS,
  CANIS_FAMILIARIS,
  FELIS_CATUS
} from '../search/test-support.js'

const post = postHandlerOf(consignmentDetails)

const cattleLineHoldingThreeIdentifiers = () => ({
  commodityLines: [
    {
      commodityCode: '0102',
      speciesLatinName: BOS_TAURUS,
      numberOfPackages: '',
      numberOfAnimalsQuantity: '3',
      animalIdentifiers: [
        { animalIdentifierEarTag: 'UK1' },
        { animalIdentifierEarTag: 'UK2' },
        { animalIdentifierEarTag: 'UK3' }
      ]
    }
  ]
})

const ANIMALS_REQUIRED_MESSAGE = 'Enter the number of animals'
const PACKAGES_WHOLE_NUMBER_MESSAGE =
  'Number of packages must be a whole number, like 5'
const EMPTY_DETAILS_REDIRECT_LOG =
  'Consignment details has no commodities, commodity question shown'
const COMMODITIES_SLUG = 'commodities'

const seedLines = () => ({
  commodityLines: [
    {
      commodityCode: '0102',
      speciesLatinName: BOS_TAURUS,
      numberOfPackages: '',
      numberOfAnimalsQuantity: ''
    },
    {
      commodityCode: '0102',
      speciesLatinName: BISON_BISON,
      numberOfPackages: '',
      numberOfAnimalsQuantity: ''
    },
    {
      commodityCode: '01063300',
      speciesLatinName: 'Struthio',
      numberOfAnimalsQuantity: ''
    }
  ]
})

const seedPerSpeciesLines = () => ({
  commodityLines: [
    {
      commodityCode: '0102',
      speciesLatinName: BOS_TAURUS,
      numberOfPackages: '',
      numberOfAnimalsQuantity: ''
    },
    {
      commodityCode: '0102',
      speciesLatinName: BISON_BISON,
      numberOfPackages: '',
      numberOfAnimalsQuantity: ''
    },
    {
      commodityCode: '01061900',
      speciesLatinName: CANIS_FAMILIARIS,
      numberOfPackages: '',
      numberOfAnimalsQuantity: ''
    },
    {
      commodityCode: '01061900',
      speciesLatinName: FELIS_CATUS,
      numberOfPackages: '',
      numberOfAnimalsQuantity: ''
    }
  ]
})

const seedTwoSpeciesOfOneCommodity = () => ({
  commodityLines: [
    {
      commodityCode: '0102',
      speciesLatinName: BOS_TAURUS,
      numberOfPackages: '',
      numberOfAnimalsQuantity: ''
    },
    {
      commodityCode: '01061900',
      speciesLatinName: CANIS_FAMILIARIS,
      numberOfPackages: '3',
      numberOfAnimalsQuantity: '7'
    },
    {
      commodityCode: '01061900',
      speciesLatinName: FELIS_CATUS,
      numberOfPackages: '4',
      numberOfAnimalsQuantity: '9'
    }
  ]
})

const COMMODITY_REMOVAL_REFUSED = {
  reason: 'no-commodity-at-index'
}

const SPECIES_REMOVAL_REFUSED = {
  reason: 'no-species-at-index'
}

const pageGetHandlerOf = (featureModule) =>
  featureModule.routes.find(
    (route) => route.method === 'GET' && !route.path.includes('remove')
  ).handler

const contextOf = async (seed) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  const h = stubH()
  await pageGetHandlerOf(consignmentDetails)(
    journeyRequest(journey.journeyId),
    h
  )
  return h.captured.view.context
}

describe('#consignmentDetailsController — per-species quantities over every line', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it("Should save each line's own quantities, keeping a package count only where the commodity takes one", async () => {
    const result = await driveHandler(post, {
      seed: seedLines(),
      payload: {
        'numberOfAnimalsQuantity-0': '25',
        'numberOfPackages-0': '5',
        'numberOfAnimalsQuantity-1': '10',
        'numberOfPackages-1': '2',
        'numberOfAnimalsQuantity-2': '40',
        'numberOfPackages-2': '9'
      }
    })
    const lines = result.after.commodityLines
    expect(lines[0].numberOfAnimalsQuantity).toBe(25)
    expect(lines[0].numberOfPackages).toBe('5')
    expect(lines[1].numberOfAnimalsQuantity).toBe(10)
    expect(lines[1].numberOfPackages).toBe('2')
    expect(lines[2].numberOfAnimalsQuantity).toBe(40)
    expect('numberOfPackages' in lines[2]).toBe(false)
  })

  it('Should re-render a non-numeric quantity against its own line and save nothing', async () => {
    const result = await driveHandler(post, {
      seed: seedLines(),
      payload: {
        'numberOfAnimalsQuantity-0': '25',
        'numberOfAnimalsQuantity-1': 'ten',
        'numberOfAnimalsQuantity-2': ''
      }
    })
    expect(result.view.context.errors['numberOfAnimalsQuantity-1']).toBe(
      'Enter a whole number greater than 0'
    )
    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.after).toEqual(result.before)
    expectNoRefusalLogged(result.logger)
  })

  it('Should block a count drop below the identifier-record count with an error naming the species, never silently trimming and logging no field refusal', async () => {
    const seed = cattleLineHoldingThreeIdentifiers()
    const result = await driveHandler(post, {
      seed,
      payload: { 'numberOfAnimalsQuantity-0': '2', 'numberOfPackages-0': '' }
    })
    expect(result.view.context.errors['numberOfAnimalsQuantity-0']).toBe(
      'You have 3 identifier records for Bos taurus but entered 2 animals. Remove identifier records or keep the higher count.'
    )
    const { errorSummary } = result.view.context
    expect(errorSummary.errorList).toHaveLength(1)
    expect(errorSummary.errorList[0].href).toContain(
      'commodities/identification'
    )
    expect(errorSummary.errorList[0].href).toContain('#identification-card-0')
    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectNoRefusalLogged(result.logger)
    expect(result.after).toEqual({
      commodityLines: [
        {
          ...seed.commodityLines[0],
          numberOfAnimalsQuantity: 3
        }
      ]
    })
  })

  it('Should save a count equal to the identifier-record count', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          {
            commodityCode: '0102',
            speciesLatinName: BOS_TAURUS,
            numberOfPackages: '',
            numberOfAnimalsQuantity: '',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
          }
        ]
      },
      payload: { 'numberOfAnimalsQuantity-0': '1', 'numberOfPackages-0': '' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.commodityLines[0].numberOfAnimalsQuantity).toBe(1)
    expect(result.after.commodityLines[0].animalIdentifiers).toHaveLength(1)
  })

  it('Should group the view by code with one quantity block per species line', async () => {
    const { groups } = await contextOf(seedLines())
    expect(groups.map((group) => [group.heading, group.code])).toEqual([
      ['0102', '0102'],
      ['01063300', '01063300']
    ])
    expect(groups[0].lines.map((line) => line.latinName)).toEqual([
      BOS_TAURUS,
      BISON_BISON
    ])
    expect(groups[0].showPackages).toBe(true)
    expect(groups[1].showPackages).toBe(false)
  })
})

describe('#consignmentDetailsController — remove and empty-selection redirects', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should remove every line of a commodity on the remove POST, leaving other commodities intact', async () => {
    const result = await driveHandler(post, {
      seed: seedLines(),
      payload: { action: 'remove:0' }
    })
    expect(result.response.redirect).toContain(consignmentDetailsPage.slug)
    expect(
      result.after.commodityLines.map((line) => line.commodityCode)
    ).toEqual(['01063300'])
  })

  it('Should send the user back to the commodity question when the removed group was the only one, leaving no commodity behind', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          {
            commodityCode: '01063300',
            speciesLatinName: 'Struthio',
            numberOfAnimalsQuantity: '4'
          }
        ]
      },
      payload: { action: 'remove:0' }
    })
    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, COMMODITIES_SLUG)
    )
    expect(result.after.commodityLines ?? []).toEqual([])
    expect(result.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId: result.journeyId, commodityCodeCount: 0 },
        message: EMPTY_DETAILS_REDIRECT_LOG
      }
    ])
  })

  it('Should send a details load with no commodities back to the commodity question rather than rendering an empty page', async () => {
    const result = await driveHandler(pageGetHandlerOf(consignmentDetails), {
      seed: { commodityLines: [] }
    })
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, COMMODITIES_SLUG)
    })
    expect(result.view).toBeUndefined()
    expect(result.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId: result.journeyId, commodityCodeCount: 0 },
        message: EMPTY_DETAILS_REDIRECT_LOG
      }
    ])
  })

  it('Should carry the change context on the redirect away from an empty details page', async () => {
    const result = await driveHandler(pageGetHandlerOf(consignmentDetails), {
      seed: { commodityLines: [] },
      query: { change: '1' }
    })
    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, COMMODITIES_SLUG)}?change=1`
    })
  })

  it('Should refuse a remove for a group index outside the selection and delete nothing', async () => {
    const seed = seedLines()
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove:7' }
    })
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectRemovalRefusedLogged(result, {
      ...COMMODITY_REMOVAL_REFUSED,
      index: 7
    })
    expect(result.after).toEqual(seed)
  })

  it('Should refuse a remove whose group index is not a number and delete nothing', async () => {
    const seed = seedLines()
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove:../0' }
    })
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectRemovalRefusedLogged(result, {
      ...COMMODITY_REMOVAL_REFUSED,
      index: NaN
    })
    expect(result.after).toEqual(seed)
  })

  it('Should reject a remove POST carrying no CSRF crumb and serve no GET route that removes', async () => {
    const server = await crumbProtectedServerMounting(
      consignmentDetails.routes,
      SET_BASE
    )

    const forged = await server.inject({
      method: 'POST',
      url: pagePath('journey-1', consignmentDetailsPage.slug),
      payload: { action: 'remove:0' }
    })
    expect(forged.statusCode).toBe(403)

    const prefetched = await server.inject({
      method: 'GET',
      url: pagePath('journey-1', 'consignment-details/0102/remove')
    })
    expect(prefetched.statusCode).toBe(404)
  })
})

describe('#consignmentDetailsController — commodities on code 01061900 are listed species by species', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should list each chosen species on code 01061900 as its own row, and every other code as one row', async () => {
    const { selectedRows } = await contextOf(seedPerSpeciesLines())
    expect(
      selectedRows.map(({ code, latinNames, removeAction }) => [
        code,
        latinNames,
        removeAction
      ])
    ).toEqual([
      ['0102', [BOS_TAURUS, BISON_BISON], 'remove:0'],
      ['01061900', [CANIS_FAMILIARIS], 'remove-species:2'],
      ['01061900', [FELIS_CATUS], 'remove-species:3']
    ])
  })

  it('Should remove one species of a 01061900 commodity and leave every other line in place', async () => {
    const seed = seedPerSpeciesLines()
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove-species:2' }
    })
    expect(result.response.redirect).toContain(consignmentDetailsPage.slug)
    expect(
      result.after.commodityLines.map(({ commodityCode, speciesLatinName }) => [
        commodityCode,
        speciesLatinName
      ])
    ).toEqual([
      ['0102', BOS_TAURUS],
      ['0102', BISON_BISON],
      ['01061900', FELIS_CATUS]
    ])
  })

  it('Should remove one species of a 01061900 commodity and leave the other species of that same commodity, answers and all', async () => {
    const result = await driveHandler(post, {
      seed: seedTwoSpeciesOfOneCommodity(),
      payload: { action: 'remove-species:1' }
    })
    expect(result.response.redirect).toContain(consignmentDetailsPage.slug)
    const lines = result.after.commodityLines
    expect(
      lines.map(({ commodityCode, speciesLatinName }) => [
        commodityCode,
        speciesLatinName
      ])
    ).toEqual([
      ['0102', BOS_TAURUS],
      ['01061900', FELIS_CATUS]
    ])
    expect(lines[1].numberOfAnimalsQuantity).toBe(9)
    expect(lines[1].numberOfPackages).toBe('4')
  })

  it('Should send the user back to the commodity question when the removed species was the last line left', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          {
            commodityCode: '01061900',
            speciesLatinName: CANIS_FAMILIARIS,
            numberOfPackages: '3',
            numberOfAnimalsQuantity: '7'
          }
        ]
      },
      payload: { action: 'remove-species:0' }
    })
    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, COMMODITIES_SLUG)
    )
    expect(result.after.commodityLines ?? []).toEqual([])
    expect(result.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId: result.journeyId, commodityCodeCount: 0 },
        message: EMPTY_DETAILS_REDIRECT_LOG
      }
    ])
  })

  it('Should refuse a species remove aimed at a commodity the page lists as one row, and delete nothing', async () => {
    const seed = seedPerSpeciesLines()
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove-species:0' }
    })
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectRemovalRefusedLogged(result, {
      ...SPECIES_REMOVAL_REFUSED,
      index: 0,
      commodityCode: '0102'
    })
    expect(result.after).toEqual(seed)
  })

  it('Should refuse a species remove for a line index outside the selection and delete nothing', async () => {
    const seed = seedPerSpeciesLines()
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove-species:9' }
    })
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectRemovalRefusedLogged(result, {
      ...SPECIES_REMOVAL_REFUSED,
      index: 9
    })
    expect(result.after).toEqual(seed)
  })

  it('Should refuse a species remove whose line index is not a number and delete nothing', async () => {
    const seed = seedPerSpeciesLines()
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove-species:../0' }
    })
    expect(result.response.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectRemovalRefusedLogged(result, {
      ...SPECIES_REMOVAL_REFUSED,
      index: NaN
    })
    expect(result.after).toEqual(seed)
  })
})

describe('#consignmentDetailsController — the animal count must be answered before the page saves', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should hold the page on a blank count rather than saving the blank, leaving the stored count and its identifier records alone', async () => {
    const seed = {
      commodityLines: [
        {
          commodityCode: '0102',
          speciesLatinName: BOS_TAURUS,
          numberOfPackages: '',
          numberOfAnimalsQuantity: '3',
          animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
        }
      ]
    }
    const result = await driveHandler(post, {
      seed,
      payload: { 'numberOfAnimalsQuantity-0': '', 'numberOfPackages-0': '' }
    })
    expect(result.view.context.errors['numberOfAnimalsQuantity-0']).toBe(
      ANIMALS_REQUIRED_MESSAGE
    )
    expect(result.after).toEqual({
      commodityLines: [
        {
          ...seed.commodityLines[0],
          numberOfAnimalsQuantity: 3
        }
      ]
    })
  })

  it('Should hold the page on a blank count when Save and return to overview is pressed, saving nothing', async () => {
    const seed = {
      commodityLines: [
        {
          commodityCode: '0102',
          speciesLatinName: BOS_TAURUS,
          numberOfPackages: '',
          numberOfAnimalsQuantity: '3'
        }
      ]
    }
    const result = await driveHandler(post, {
      seed,
      payload: {
        'numberOfAnimalsQuantity-0': '',
        'numberOfPackages-0': '',
        exit: 'hub'
      }
    })
    expect(result.response.redirect).toBeUndefined()
    expect(result.view.context.errors['numberOfAnimalsQuantity-0']).toBe(
      ANIMALS_REQUIRED_MESSAGE
    )
    expect(result.after.commodityLines[0].numberOfAnimalsQuantity).toBe(3)
  })

  it('Should name every line left blank in the error summary, one entry per species', async () => {
    const result = await driveHandler(post, {
      seed: seedLines(),
      payload: {
        'numberOfAnimalsQuantity-0': '',
        'numberOfAnimalsQuantity-1': '4',
        'numberOfAnimalsQuantity-2': ''
      }
    })
    const { errors, errorSummary } = result.view.context
    expect(errors['numberOfAnimalsQuantity-0']).toBe(ANIMALS_REQUIRED_MESSAGE)
    expect(errors['numberOfAnimalsQuantity-1']).toBeUndefined()
    expect(errors['numberOfAnimalsQuantity-2']).toBe(ANIMALS_REQUIRED_MESSAGE)
    expect(errorSummary.errorList.map(({ href }) => href)).toEqual([
      '#numberOfAnimalsQuantity-0',
      '#numberOfAnimalsQuantity-2'
    ])
    expect(result.after).toEqual(result.before)
  })

  it('Should list every number of animals error before any number of packages error', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          { commodityCode: '0102', speciesLatinName: BOS_TAURUS },
          { commodityCode: '0102', speciesLatinName: BISON_BISON }
        ]
      },
      payload: {
        'numberOfAnimalsQuantity-0': '',
        'numberOfAnimalsQuantity-1': '',
        'numberOfPackages-0': 'abc',
        'numberOfPackages-1': 'abc'
      }
    })
    const { errorList } = result.view.context.errorSummary
    expect(errorList).toEqual([
      { href: '#numberOfAnimalsQuantity-0', text: ANIMALS_REQUIRED_MESSAGE },
      { href: '#numberOfAnimalsQuantity-1', text: ANIMALS_REQUIRED_MESSAGE },
      { href: '#numberOfPackages-0', text: PACKAGES_WHOLE_NUMBER_MESSAGE },
      { href: '#numberOfPackages-1', text: PACKAGES_WHOLE_NUMBER_MESSAGE }
    ])
    expect(result.after.commodityLines).toHaveLength(2)
  })
})

describe('#consignmentDetailsController — Add another commodity', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should offer the commodity question marked to return to commodity details', async () => {
    const result = await driveHandler(pageGetHandlerOf(consignmentDetails), {
      seed: seedLines()
    })
    expect(result.view.context.addHref).toBe(
      `${pagePath(result.journeyId, COMMODITIES_SLUG)}?return=${consignmentDetailsPage.slug}`
    )
  })
})

describe('#consignmentDetailsController — the Back link', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  const seed = {
    countryOfOrigin: 'FR',
    commodityLines: [
      {
        commodityCode: '0102',
        speciesLatinName: BOS_TAURUS,
        numberOfPackages: '',
        numberOfAnimalsQuantity: ''
      }
    ]
  }

  it('Should go Back to What are you importing? while the opening run is on', async () => {
    const result = await driveHandler(pageGetHandlerOf(consignmentDetails), {
      seed,
      openingRun: RUN_ACTIVE
    })
    expectBackLinkIsPage(result, COMMODITIES_SLUG)
  })

  it('Should keep Back on What are you importing? when the page is shown again after a refusal in the run', async () => {
    const result = await driveHandler(post, {
      seed,
      payload: { 'numberOfAnimalsQuantity-0': '', 'numberOfPackages-0': '' },
      openingRun: RUN_ACTIVE
    })
    expect(result.view.context.errors['numberOfAnimalsQuantity-0']).toBe(
      ANIMALS_REQUIRED_MESSAGE
    )
    expectBackLinkIsPage(result, COMMODITIES_SLUG)
  })

  it('Should go Back to the overview when the page is opened from the overview', async () => {
    const result = await driveHandler(pageGetHandlerOf(consignmentDetails), {
      seed
    })
    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })
})
