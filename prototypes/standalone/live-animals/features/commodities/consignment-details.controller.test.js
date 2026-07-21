import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from '../../flow/dispatch.js'
import { readyForCheckYourAnswers } from '../../flow/section-status.js'
import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import {
  driveHandler,
  postHandlerOf,
  journeyRequest,
  stubH
} from '../../engine/test-support.js'
import { dispatchPages } from '../index.js'

import * as consignmentDetails from './consignment-details.controller.js'

const post = postHandlerOf(consignmentDetails)

const seedLines = () => ({
  commodityLines: [
    {
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
      numberOfPackages: '',
      numberOfAnimalsQuantity: ''
    },
    {
      commoditySelection: 'Cow',
      speciesSelection: '716661',
      numberOfPackages: '',
      numberOfAnimalsQuantity: ''
    },
    {
      commoditySelection: 'Fish',
      speciesSelection: '801204',
      numberOfAnimalsQuantity: ''
    }
  ]
})

describe('#consignmentDetailsController — per-species quantities over every line', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    buildDispatch(dispatchPages)
    configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
  })
  beforeEach(() => store.clear())

  it("Should save each line's own quantities, packages only where the commodity applies", async () => {
    const result = await driveHandler(post, {
      seed: seedLines(),
      payload: {
        'numberOfAnimalsQuantity-0': '25',
        'numberOfPackages-0': '5',
        'numberOfAnimalsQuantity-1': '10',
        'numberOfPackages-1': '2',
        'numberOfAnimalsQuantity-2': '40',
        // Fish takes no package count — a smuggled value must not persist.
        'numberOfPackages-2': '9'
      }
    })
    const lines = result.after.commodityLines
    expect(lines[0].numberOfAnimalsQuantity).toBe('25')
    expect(lines[0].numberOfPackages).toBe('5')
    expect(lines[1].numberOfAnimalsQuantity).toBe('10')
    expect(lines[1].numberOfPackages).toBe('2')
    expect(lines[2].numberOfAnimalsQuantity).toBe('40')
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
      'Number of animals must be a whole number, like 25'
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should block a count drop below the identifier-record count with an error naming the species, never silently trimming (inc-063, c-031)', async () => {
    const seed = {
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          numberOfPackages: '',
          numberOfAnimalsQuantity: '3',
          animalIdentifiers: [
            { animalIdentifierEarTag: 'UK1' },
            { animalIdentifierEarTag: 'UK2' },
            { animalIdentifierEarTag: 'UK3' }
          ]
        }
      ]
    }
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
    expect(result.after).toEqual(result.before)
  })

  it('Should save a count equal to or above the identifier-record count', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          {
            commoditySelection: 'Cow',
            speciesSelection: '1148346',
            numberOfPackages: '',
            numberOfAnimalsQuantity: '',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
          }
        ]
      },
      payload: { 'numberOfAnimalsQuantity-0': '1', 'numberOfPackages-0': '' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.commodityLines[0].numberOfAnimalsQuantity).toBe('1')
    expect(result.after.commodityLines[0].animalIdentifiers).toHaveLength(1)
  })

  it('Should leave a blank count out of the drop check — unanswered means uncapped, not zero', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityLines: [
          {
            commoditySelection: 'Cow',
            speciesSelection: '1148346',
            numberOfPackages: '',
            numberOfAnimalsQuantity: '3',
            animalIdentifiers: [{ animalIdentifierEarTag: 'UK1' }]
          }
        ]
      },
      payload: { 'numberOfAnimalsQuantity-0': '', 'numberOfPackages-0': '' }
    })
    expect(result.view).toBeUndefined()
    expect(result.after.commodityLines[0].numberOfAnimalsQuantity).toBe('')
    expect(result.after.commodityLines[0].animalIdentifiers).toHaveLength(1)
  })

  it('Should group the view by commodity with one quantity block per species line', async () => {
    const journey = await store.create()
    await store.saveAnswers(journey.journeyId, seedLines())
    const request = journeyRequest(journey.journeyId)
    const h = stubH()
    const getHandler = consignmentDetails.routes.find(
      (route) => route.method === 'GET' && !route.path.includes('remove')
    ).handler
    await getHandler(request, h)
    const { groups } = h.captured.view.context
    expect(groups.map((group) => [group.name, group.code])).toEqual([
      ['Cow', '0102'],
      ['Fish', '0301']
    ])
    expect(groups[0].lines.map((line) => line.speciesText)).toEqual([
      'Bos taurus',
      'Bison bison'
    ])
    expect(groups[0].showPackages).toBe(true)
    expect(groups[1].showPackages).toBe(false)
  })

  it('Should remove every line of a commodity via its remove route, leaving other commodities intact', async () => {
    const journey = await store.create()
    await store.saveAnswers(journey.journeyId, seedLines())
    const request = journeyRequest(journey.journeyId, {
      params: { commodity: 'Cow' }
    })
    const removeHandler = consignmentDetails.routes.find((route) =>
      route.path.includes('remove')
    ).handler
    const response = await removeHandler(request, stubH())
    const answers = (await store.get(journey.journeyId)).answers
    expect(
      answers.commodityLines.map((line) => line.commoditySelection)
    ).toEqual(['Fish'])
    expect(response.redirect).toContain('consignment-details')
  })
})
