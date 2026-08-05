import Hapi from '@hapi/hapi'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import {
  driveHandler,
  postHandlerOf
} from '../../../../../../../engine/test-support.js'
import * as state from '../../../../../../../engine/index.js'
import { projectAnswers } from '../../../../../../../bridge/fulfilments/index.js'
import { plantProducts } from '../../../../../../../routes-plant-products.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../../shared/set-context.js'
import { records } from '../../../../../services/records/stub.js'
import { toDto } from '../../../../../services/records/mapper/to-dto.js'
import * as consignorConfirmation from './consignor-confirmation.controller.js'

const SET_ID = 'plant-products'

const get = consignorConfirmation.routes.find(
  ({ method }) => method === 'GET'
).handler
const post = postHandlerOf(consignorConfirmation)
const drive = (handler, options) =>
  withSetContext(SET_ID, () => driveHandler(handler, options))

const consignorAnswers = {
  consignorName: 'Orchard Export SAS',
  consignorAddressLine1: '12 Rue des Vergers',
  consignorAddressLine2: 'Building B',
  consignorAddressLine3: 'Export Quarter',
  consignorCity: 'Lyon',
  consignorPostcode: '69001',
  consignorTelephone: '+33 4 72 00 00 00',
  consignorCountry: 'FR',
  consignorEmail: 'exports@example.com'
}

describe('plant-products consignor-confirmation controller', () => {
  let server

  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
  })

  beforeEach(async () => {
    enterSetContext(SET_ID)
    await records.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })

  it('renders the confirmation panel view model', async () => {
    const result = await drive(get, { seed: consignorAnswers })

    expect(result.view.view).toContain(
      'features/traders/consignor-confirmation/consignor-confirmation'
    )
    expect(result.view.context.copy.panelTitle).toBe(
      'The consignor or exporter has been created'
    )
  })

  it('returns to the consignor picker without changing the exact persisted consignor DTO', async () => {
    const commit = vi.spyOn(state, 'commit')
    const result = await drive(post, { seed: consignorAnswers })
    const stored = await records.load({ journeyId: result.journeyId })

    expect(result.response).toEqual({
      redirect: `/plant-products/notifications/${result.journeyId}/consignor-select`
    })
    expect(result.after).toEqual(consignorAnswers)
    expect(commit).not.toHaveBeenCalled()
    const dto = withSetContext(SET_ID, () =>
      toDto(projectAnswers(stored.fulfilment))
    )

    expect(dto.consignor).toEqual({
      name: 'Orchard Export SAS',
      telephone: '+33 4 72 00 00 00',
      email: 'exports@example.com',
      address: {
        addressLine1: '12 Rue des Vergers',
        addressLine2: 'Building B',
        addressLine3: 'Export Quarter',
        city: 'Lyon',
        postcode: '69001',
        country: 'FR'
      }
    })
  })

  it('lets a hub exit win without committing or mutating state', async () => {
    const result = await drive(post, {
      seed: consignorAnswers,
      payload: { exit: 'hub' }
    })

    expect(result.response).toEqual({
      redirect: `/plant-products/notifications/${result.journeyId}`
    })
    expect(result.after).toEqual(consignorAnswers)
  })
})
