import Hapi from '@hapi/hapi'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { store } from '../../../../../../engine/store.js'
import { journeyRequest, stubH } from '../../../../../../engine/test-support.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import { records as recordsStub } from '../../../../services/records/stub.js'
import * as confirmation from './controller.js'

const get = confirmation.routes.find(({ method }) => method === 'GET').handler
const inPlantProducts = (operation) =>
  withSetContext('plant-products', operation)

describe('plant-products confirmation controller', () => {
  let server

  beforeAll(async () => {
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
  })

  beforeEach(async () => {
    enterSetContext('plant-products')
    configureRecords('plant-products', recordsStub)
    await inPlantProducts(() => store.clear())
  })

  afterAll(async () => server.stop({ timeout: 0 }))

  it('redirects an unsubmitted notification to its plant-products hub', async () => {
    const journey = await inPlantProducts(() => recordsStub.create())

    const response = await inPlantProducts(() =>
      get(journeyRequest(journey.journeyId), stubH())
    )

    expect(response).toEqual({
      redirect: `/plant-products/notifications/${journey.journeyId}`
    })
  })

  it('renders the submitted reference details and resolved plant dashboard href', async () => {
    const journey = await inPlantProducts(() => recordsStub.create())
    await inPlantProducts(() => recordsStub.finalise(journey.journeyId))
    const h = stubH()

    await inPlantProducts(() => get(journeyRequest(journey.journeyId), h))

    expect(h.captured.view.view).toBe(
      'plant-products/journeys/linear/features/confirmation/template'
    )
    expect(h.captured.view.context).toMatchObject({
      pageTitle: 'Import notification sent',
      referenceNumber: journey.journeyId,
      customsDeclarationReference: journey.journeyId,
      customsDocumentCode: 'C085',
      inspectionStatus: 'Not required',
      dashboardHref: '/plant-products'
    })
  })
})
