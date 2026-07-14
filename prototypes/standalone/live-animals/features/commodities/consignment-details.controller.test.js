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

describe('consignment details — per-species quantities over every line', () => {
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
