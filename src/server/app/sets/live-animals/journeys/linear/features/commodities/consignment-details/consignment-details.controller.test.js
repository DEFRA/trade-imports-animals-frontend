import { SET_BASE, SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import { RUN_ACTIVE } from '../../../../../../../flow/run-state.js'
import { store } from '../../../../../../../engine/store.js'
import {
  crumbProtectedServerMounting,
  driveHandler,
  expectBackLinkIsPage,
  expectOneLogged,
  expectRemovalRefusedLogged,
  postHandlerOf,
  journeyRequest,
  renderedErrorPageFor,
  stubH,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import { dispatchPages } from '../../index.js'
import { consignmentDetailsPage } from '../page.js'
import { lineKey } from '../search/selection/line-key.js'

import * as consignmentDetails from './consignment-details.controller.js'
import {
  BISON_BISON,
  BISON_BISON_ROW,
  BOS_TAURUS,
  BOS_TAURUS_ROW,
  FELIS_CATUS,
  FELIS_CATUS_ROW,
  MUSTELA_PUTORIUS_FURO,
  MUSTELA_PUTORIUS_FURO_ROW,
  STRUTHIO_ROW,
  labelFor,
  lineOf
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
const ANIMALS_ABOVE_MAX_MESSAGE =
  'Number of animals must be 2,147,483,647 or fewer'
const PACKAGES_WHOLE_NUMBER_MESSAGE =
  'Number of packages must be a whole number, like 5'
const PACKAGES_ABOVE_MAX_MESSAGE =
  'Number of packages must be 2,147,483,647 or fewer'
const LARGEST_QUANTITY_THE_SERVICE_STORES = 2147483647
const COMMODITIES_SLUG = 'commodities'
const REMOVE_CATTLE = `remove:${BOS_TAURUS_ROW.commodityCode}`

const blankCattlePairLines = () => [
  lineOf(BOS_TAURUS_ROW),
  lineOf(BISON_BISON_ROW)
]

const seedLines = () => ({
  commodityLines: [
    ...blankCattlePairLines(),
    {
      commodityCode: '01063300',
      speciesLatinName: 'Struthio',
      numberOfAnimalsQuantity: ''
    }
  ]
})

const seedPerSpeciesLines = () => ({
  commodityLines: [
    ...blankCattlePairLines(),
    lineOf(MUSTELA_PUTORIUS_FURO_ROW),
    lineOf(FELIS_CATUS_ROW)
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
      speciesLatinName: MUSTELA_PUTORIUS_FURO,
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
  reason: 'no-commodity-for-code'
}

const expectRedirectedToCommodityQuestionLogged = (result, fields) =>
  expectOneLogged(result.logger, {
    level: 'info',
    fields: { journeyId: result.journeyId, ...fields },
    message: 'Redirected to the commodity question'
  })

const SPECIES_REMOVAL_REFUSED = {
  reason: 'no-species-for-key'
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

  it('Should re-render a non-numeric quantity against its own line and save nothing, and log nothing', async () => {
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
    expect(result.logger.entries).toEqual([])
  })

  it('Should re-render a number of animals above the largest the service stores against its own line, keeping what was typed, saving nothing and logging nothing', async () => {
    const aboveMax = String(LARGEST_QUANTITY_THE_SERVICE_STORES + 1)
    const result = await driveHandler(post, {
      seed: seedLines(),
      payload: {
        'numberOfAnimalsQuantity-0': '25',
        'numberOfAnimalsQuantity-1': aboveMax,
        'numberOfAnimalsQuantity-2': '40'
      }
    })
    const lines = result.view.context.groups.flatMap((group) => group.lines)
    expect(lines[1].animalsValue).toBe(aboveMax)
    expect(result.view.context.errors['numberOfAnimalsQuantity-1']).toBe(
      ANIMALS_ABOVE_MAX_MESSAGE
    )
    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.after).toEqual(result.before)
    expect(result.logger.entries).toEqual([])
  })

  it('Should accept and exactly save a number of animals at the largest the service stores', async () => {
    const result = await driveHandler(post, {
      seed: seedLines(),
      payload: {
        'numberOfAnimalsQuantity-0': String(
          LARGEST_QUANTITY_THE_SERVICE_STORES
        ),
        'numberOfAnimalsQuantity-1': '10',
        'numberOfAnimalsQuantity-2': '40'
      }
    })
    expect(result.view).toBeUndefined()
    expect(result.response.redirect).toBeDefined()
    expect(result.after.commodityLines[0].numberOfAnimalsQuantity).toBe(
      LARGEST_QUANTITY_THE_SERVICE_STORES
    )
  })

  it('Should re-render a number of packages above the largest the service stores against its own line, keeping what was typed, saving nothing and logging nothing', async () => {
    const aboveMax = String(LARGEST_QUANTITY_THE_SERVICE_STORES + 1)
    const result = await driveHandler(post, {
      seed: seedLines(),
      payload: {
        'numberOfAnimalsQuantity-0': '25',
        'numberOfAnimalsQuantity-1': '10',
        'numberOfAnimalsQuantity-2': '40',
        'numberOfPackages-0': aboveMax,
        'numberOfPackages-1': '5'
      }
    })
    const lines = result.view.context.groups.flatMap((group) => group.lines)
    expect(lines[0].packagesValue).toBe(aboveMax)
    expect(result.view.context.errors['numberOfPackages-0']).toBe(
      PACKAGES_ABOVE_MAX_MESSAGE
    )
    expect(result.view.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(result.after).toEqual(result.before)
    expect(result.logger.entries).toEqual([])
  })

  it('Should accept and exactly save a number of packages at the largest the service stores', async () => {
    const result = await driveHandler(post, {
      seed: seedLines(),
      payload: {
        'numberOfAnimalsQuantity-0': '25',
        'numberOfAnimalsQuantity-1': '10',
        'numberOfAnimalsQuantity-2': '40',
        'numberOfPackages-0': String(LARGEST_QUANTITY_THE_SERVICE_STORES),
        'numberOfPackages-1': '5'
      }
    })
    expect(result.view).toBeUndefined()
    expect(result.response.redirect).toBeDefined()
    expect(result.after.commodityLines[0].numberOfPackages).toBe(
      String(LARGEST_QUANTITY_THE_SERVICE_STORES)
    )
  })

  it('Should block a count drop below the identifier-record count with an error naming the species, never silently trimming, and log nothing', async () => {
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
    expect(result.logger.entries).toEqual([])
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
    expect(groups[0].lines.map((line) => line.label)).toEqual([
      labelFor(BOS_TAURUS),
      labelFor(BISON_BISON)
    ])
    expect(groups[0].showPackages).toBe(true)
    expect(groups[1].showPackages).toBe(false)
  })
})

describe('#consignmentDetailsController — a removal keeps the numbers typed into the lines that stay', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should keep the typed numbers for both surviving lines through a commodity-level removal, and drop every line of the removed commodity', async () => {
    const seed = seedTwoSpeciesOfOneCommodity()
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: REMOVE_CATTLE,
        'numberOfAnimalsQuantity-1': '11',
        'numberOfPackages-1': '6',
        'numberOfAnimalsQuantity-2': '22',
        'numberOfPackages-2': '7'
      }
    })
    const lines = result.view.context.groups.flatMap((group) => group.lines)
    expect(
      lines.map(({ animalsValue, packagesValue }) => [
        animalsValue,
        packagesValue
      ])
    ).toEqual([
      ['11', '6'],
      ['22', '7']
    ])
    expect(
      result.after.commodityLines.map((line) => line.commodityCode)
    ).toEqual(['01061900', '01061900'])
  })

  it('Should keep the typed numbers for both surviving lines through a species-level removal', async () => {
    const seed = seedTwoSpeciesOfOneCommodity()
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: `remove-species:${lineKey(seed.commodityLines[1])}`,
        'numberOfAnimalsQuantity-0': '12',
        'numberOfPackages-0': '2',
        'numberOfAnimalsQuantity-2': '33',
        'numberOfPackages-2': '8'
      }
    })
    const lines = result.view.context.groups.flatMap((group) => group.lines)
    expect(
      lines.map(({ animalsValue, packagesValue }) => [
        animalsValue,
        packagesValue
      ])
    ).toEqual([
      ['12', '2'],
      ['33', '8']
    ])
    expect(
      result.after.commodityLines.map(({ commodityCode, speciesLatinName }) => [
        commodityCode,
        speciesLatinName
      ])
    ).toEqual([
      ['0102', BOS_TAURUS],
      ['01061900', FELIS_CATUS]
    ])
  })

  it('Should store nothing the trader typed into the surviving lines on a removal', async () => {
    const seed = seedTwoSpeciesOfOneCommodity()
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: REMOVE_CATTLE,
        'numberOfAnimalsQuantity-1': '11',
        'numberOfPackages-1': '6',
        'numberOfAnimalsQuantity-2': '22',
        'numberOfPackages-2': '7'
      }
    })
    expect(
      result.after.commodityLines.map(
        ({ numberOfAnimalsQuantity, numberOfPackages }) => [
          numberOfAnimalsQuantity,
          numberOfPackages
        ]
      )
    ).toEqual([
      [7, '3'],
      [9, '4']
    ])
  })

  it('Should keep the stored packages value for a surviving line whose commodity takes none, and log nothing', async () => {
    const result = await driveHandler(post, {
      seed: seedLines(),
      payload: {
        action: REMOVE_CATTLE,
        'numberOfAnimalsQuantity-2': '77'
      }
    })
    const [line] = result.view.context.groups.flatMap((group) => group.lines)
    expect(line.animalsValue).toBe('77')
    expect(line.packagesValue).toBe('')
    expect(result.logger.entries).toEqual([])
  })

  it('Should show a surviving line its stored number of animals and log once when the post names no number of animals for it', async () => {
    const seed = seedPerSpeciesLines()
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: `remove-species:${lineKey(seed.commodityLines[2])}`,
        'numberOfAnimalsQuantity-0': '15',
        'numberOfPackages-0': '2',
        'numberOfPackages-1': '3',
        'numberOfAnimalsQuantity-3': '21',
        'numberOfPackages-3': '9'
      }
    })
    const lines = result.view.context.groups.flatMap((group) => group.lines)
    expect(lines.map((line) => line.animalsValue)).toEqual(['15', '', '21'])
    expect(lines[1].packagesValue).toBe('3')
    expectOneLogged(result.logger, {
      level: 'warn',
      fields: {
        journeyId: result.journeyId,
        action: `remove-species:${lineKey(seed.commodityLines[2])}`,
        lineKeys: [lineKey(seed.commodityLines[1])]
      },
      message:
        'A removal post named no count the page renders for a surviving line: its stored value is shown'
    })
  })

  it('Should show a surviving line its stored number of packages and log once when the post names no number of packages for it', async () => {
    const seed = {
      commodityLines: [
        lineOf(MUSTELA_PUTORIUS_FURO_ROW),
        lineOf(BOS_TAURUS_ROW, {
          numberOfPackages: '5',
          numberOfAnimalsQuantity: '8'
        })
      ]
    }
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: `remove-species:${lineKey(seed.commodityLines[0])}`,
        'numberOfAnimalsQuantity-1': '12'
      }
    })
    const [line] = result.view.context.groups.flatMap((group) => group.lines)
    expect(line.animalsValue).toBe('12')
    expect(line.packagesValue).toBe('5')
    expectOneLogged(result.logger, {
      level: 'warn',
      fields: {
        journeyId: result.journeyId,
        action: `remove-species:${lineKey(seed.commodityLines[0])}`,
        lineKeys: [lineKey(seed.commodityLines[1])]
      },
      message:
        'A removal post named no count the page renders for a surviving line: its stored value is shown'
    })
  })

  it('Should refuse a repeated commodity-level removal and leave the surviving commodities exactly as the first removal left them', async () => {
    const seed = {
      commodityLines: [
        lineOf(BOS_TAURUS_ROW),
        lineOf(MUSTELA_PUTORIUS_FURO_ROW),
        lineOf(STRUTHIO_ROW)
      ]
    }
    const journey = await store.create()
    await store.seedAnswers(journey.journeyId, seed)
    const payload = { action: `remove:${BOS_TAURUS_ROW.commodityCode}` }

    const first = journeyRequest(journey.journeyId, { payload })
    await post(first, stubH(first))

    const second = journeyRequest(journey.journeyId, { payload })
    const response = await post(second, stubH(second))

    expect(response.output.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(renderedErrorPageFor(response)).toMatchObject({
      heading: HTTP_STATUS_BAD_REQUEST,
      message: 'There is a problem with your request'
    })
    expectRemovalRefusedLogged(
      { logger: second.logger, journeyId: journey.journeyId },
      { reason: 'no-commodity-for-code', code: BOS_TAURUS_ROW.commodityCode }
    )
    const after = (await store.get(journey.journeyId)).answers
    expect(
      after.commodityLines.map(({ commodityCode, speciesLatinName }) => [
        commodityCode,
        speciesLatinName
      ])
    ).toEqual([
      [MUSTELA_PUTORIUS_FURO_ROW.commodityCode, MUSTELA_PUTORIUS_FURO],
      [STRUTHIO_ROW.commodityCode, STRUTHIO_ROW.speciesLatinName]
    ])
  })
})

describe('#consignmentDetailsController — removal and empty-selection redirects', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should render the page with every line of the removed commodity gone and the other commodity intact', async () => {
    const result = await driveHandler(post, {
      seed: seedLines(),
      payload: { action: REMOVE_CATTLE }
    })
    expect(result.view.context.groups.map((group) => group.code)).toEqual([
      '01063300'
    ])
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
      payload: { action: 'remove:01063300' }
    })
    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, COMMODITIES_SLUG)
    )
    expect(result.after.commodityLines ?? []).toEqual([])
    expectRedirectedToCommodityQuestionLogged(result, {
      reason: 'last-commodity-removed',
      commodityCode: '01063300'
    })
  })

  it('Should send a details load with no commodities back to the commodity question rather than rendering an empty page', async () => {
    const result = await driveHandler(pageGetHandlerOf(consignmentDetails), {
      seed: { commodityLines: [] }
    })
    expect(result.response).toEqual({
      redirect: pagePath(result.journeyId, COMMODITIES_SLUG)
    })
    expect(result.view).toBeUndefined()
    expectRedirectedToCommodityQuestionLogged(result, {
      reason: 'no-commodities-on-load'
    })
  })

  it('Should carry the change context on the redirect away from an empty details page', async () => {
    const result = await driveHandler(pageGetHandlerOf(consignmentDetails), {
      seed: { commodityLines: [] },
      query: { change: '1' }
    })
    expect(result.response).toEqual({
      redirect: `${pagePath(result.journeyId, COMMODITIES_SLUG)}?change=1`
    })
    expectRedirectedToCommodityQuestionLogged(result, {
      reason: 'no-commodities-on-load'
    })
  })

  it('Should refuse a remove naming a commodity code the selection does not hold, and delete nothing', async () => {
    const seed = seedLines()
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove:9999' }
    })
    expect(result.response.output.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectRemovalRefusedLogged(result, {
      ...COMMODITY_REMOVAL_REFUSED,
      code: '9999'
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
      payload: { action: REMOVE_CATTLE }
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

  it('Should list each chosen species on code 01061900 as its own row, and every other code its own commodity-named remove', async () => {
    const seed = seedPerSpeciesLines()
    const { selectedRows } = await contextOf(seed)
    expect(
      selectedRows.map(({ code, labels, removeAction }) => [
        code,
        labels,
        removeAction
      ])
    ).toEqual([
      ['0102', [labelFor(BOS_TAURUS), labelFor(BISON_BISON)], REMOVE_CATTLE],
      [
        '01061900',
        [labelFor(MUSTELA_PUTORIUS_FURO)],
        `remove-species:${lineKey(seed.commodityLines[2])}`
      ],
      [
        '01061900',
        [labelFor(FELIS_CATUS)],
        `remove-species:${lineKey(seed.commodityLines[3])}`
      ]
    ])
  })

  it('Should remove one species of a 01061900 commodity and leave every other line in place', async () => {
    const seed = seedPerSpeciesLines()
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: `remove-species:${lineKey(seed.commodityLines[2])}`
      }
    })
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
    const seed = seedTwoSpeciesOfOneCommodity()
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: `remove-species:${lineKey(seed.commodityLines[1])}`
      }
    })
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
    const seed = {
      commodityLines: [
        {
          commodityCode: '01061900',
          speciesLatinName: MUSTELA_PUTORIUS_FURO,
          numberOfPackages: '3',
          numberOfAnimalsQuantity: '7'
        }
      ]
    }
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: `remove-species:${lineKey(seed.commodityLines[0])}`
      }
    })
    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, COMMODITIES_SLUG)
    )
    expect(result.after.commodityLines ?? []).toEqual([])
    expectRedirectedToCommodityQuestionLogged(result, {
      reason: 'last-commodity-removed',
      commodityCode: '01061900'
    })
  })

  it('Should refuse a species remove aimed at a commodity the page lists as one row, and delete nothing', async () => {
    const seed = seedPerSpeciesLines()
    const result = await driveHandler(post, {
      seed,
      payload: {
        action: `remove-species:${lineKey(seed.commodityLines[0])}`
      }
    })
    expect(result.response.output.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expectRemovalRefusedLogged(result, {
      ...SPECIES_REMOVAL_REFUSED,
      key: lineKey(seed.commodityLines[0]),
      commodityCode: '0102'
    })
    expect(result.after).toEqual(seed)
  })

  it('Should refuse a species remove naming a key the selection does not hold, and delete nothing', async () => {
    const seed = seedPerSpeciesLines()
    const result = await driveHandler(post, {
      seed,
      payload: { action: 'remove-species:9999|Not a line' }
    })
    expect(result.response.output.statusCode).toBe(HTTP_STATUS_BAD_REQUEST)
    expect(renderedErrorPageFor(result.response)).toMatchObject({
      heading: HTTP_STATUS_BAD_REQUEST,
      message: 'There is a problem with your request'
    })
    expectRemovalRefusedLogged(result, {
      ...SPECIES_REMOVAL_REFUSED,
      key: '9999|Not a line'
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
