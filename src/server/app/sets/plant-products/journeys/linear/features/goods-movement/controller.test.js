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
  journeyRequest,
  postHandlerOf,
  stubH
} from '../../../../../../engine/test-support.js'
import { store } from '../../../../../../engine/store.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import * as kit from '../../../../../../shared/kit.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import { records } from '../../../../services/records/stub.js'
import * as contact from '../contact/controller.js'
import * as goodsMovement from './controller.js'
import { copy } from './copy/copy.en.js'

const get = goodsMovement.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(goodsMovement)
const contactPost = postHandlerOf(contact)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const validPayload = (overrides = {}) => ({
  commonTransitConvention: 'ADD_MRN_NOW',
  movementReferenceNumber: '24GB123456789AB012',
  usingGvms: 'yes',
  ...overrides
})

describe('plant-products goods-movement controller', () => {
  let server

  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
  })

  beforeEach(async () => {
    enterSetContext('plant-products')
    await records.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })

  it('prefills all three canonical answers and maps the GVMS boolean to a radio value', async () => {
    const result = await drive(get, {
      seed: {
        commonTransitConvention: 'ADD_MRN_NOW',
        movementReferenceNumber: '24GB123456789AB012',
        usingGvms: false
      }
    })

    expect(result.view.context.values).toEqual({
      commonTransitConvention: 'ADD_MRN_NOW',
      movementReferenceNumber: '24GB123456789AB012',
      usingGvms: 'no'
    })
  })

  it('returns both required radio errors, preserves raw values and commits nothing for an empty POST', async () => {
    const payload = {
      commonTransitConvention: '',
      movementReferenceNumber: '',
      usingGvms: ''
    }
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      commonTransitConvention: copy.errors.commonTransitConventionRequired,
      usingGvms: copy.errors.usingGvmsRequired
    })
    expect(result.view.context.values).toEqual(payload)
    expect(result.after).toEqual({})
  })

  it.each([
    ['an empty MRN', ''],
    ['a 17-character MRN', '24GB123456789AB01'],
    ['an MRN whose first two characters are not numbers', 'GBGB123456789AB012']
  ])('rejects %s with the canonical MRN error', async (_name, mrn) => {
    const payload = validPayload({ movementReferenceNumber: mrn })
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      movementReferenceNumber: copy.errors.movementReferenceNumberInvalid
    })
    expect(result.view.context.values).toEqual(payload)
    expect(result.after).toEqual({})
  })

  it('trims a valid MRN, converts GVMS to boolean and redirects through nextTarget', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(post, {
      payload: validPayload({
        commonTransitConvention: ' ADD_MRN_NOW ',
        movementReferenceNumber: ' 24GB123456789AB012 ',
        usingGvms: 'yes'
      })
    })

    expect(result.after).toEqual({
      commonTransitConvention: 'ADD_MRN_NOW',
      movementReferenceNumber: '24GB123456789AB012',
      usingGvms: true
    })
    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('keeps GVMS Yes after committing a different page', async () => {
    vi.spyOn(kit, 'nextTarget').mockResolvedValue(
      '/plant-products/notifications/next-target'
    )
    const answers = await withSetContext('plant-products', async () => {
      const journey = await store.create()

      await post(
        journeyRequest(journey.journeyId, { payload: validPayload() }),
        stubH()
      )
      await contactPost(
        journeyRequest(journey.journeyId, {
          payload: {
            responsiblePersonName: 'Isabel Irwin',
            responsiblePersonEmail: 'isabel@example.com',
            responsiblePersonTelephone: ''
          }
        }),
        stubH()
      )

      return (await store.get(journey.journeyId)).answers
    })

    expect(answers).toMatchObject({
      usingGvms: true,
      responsiblePersonName: 'Isabel Irwin'
    })
  })

  it('switching away from ADD_MRN_NOW ignores a stale submitted MRN and purges the stored MRN', async () => {
    vi.spyOn(kit, 'nextTarget').mockResolvedValue(
      '/plant-products/notifications/next-target'
    )
    const result = await drive(post, {
      seed: {
        commonTransitConvention: 'ADD_MRN_NOW',
        movementReferenceNumber: '24GB123456789AB012',
        usingGvms: true
      },
      payload: {
        commonTransitConvention: 'NO',
        movementReferenceNumber: 'not-an-mrn',
        usingGvms: 'no'
      }
    })

    expect(result.after).toEqual({
      commonTransitConvention: 'NO',
      usingGvms: false
    })
    expect(result.after).not.toHaveProperty('movementReferenceNumber')
  })

  it('renders raw values and a recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const payload = validPayload({
      movementReferenceNumber: ' 24GB123456789AB012 '
    })
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.values).toEqual(payload)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual({})
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(drive(post, { payload: validPayload() })).rejects.toThrow(
      'programming failure'
    )
  })
})
