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
import { plantProducts } from '../../../../../../../routes-plant-products.js'
import * as kit from '../../../../../../../shared/kit.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../../shared/set-context.js'
import { records } from '../../../../../services/records/stub.js'
import * as commodityInputMethod from './commodity-input-method.controller.js'
import { copy as featureCopy } from '../copy/copy.en.js'

const copy = featureCopy.inputMethod
const get = commodityInputMethod.routes.find(
  ({ method }) => method === 'GET'
).handler
const post = postHandlerOf(commodityInputMethod)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

describe('plant-products commodity-input-method controller', () => {
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

  it('renders GET with neither input method selected when unanswered', async () => {
    const result = await drive(get)

    expect(result.view.context.values).toEqual({ commodityInputMethod: '' })
    expect(result.view.context.inputMethodOptions).toEqual([
      {
        value: 'MANUAL',
        text: copy.options.MANUAL.label,
        hint: { text: copy.options.MANUAL.hint },
        label: { classes: 'govuk-!-font-weight-bold' },
        checked: false
      },
      {
        value: 'CSV',
        text: copy.options.CSV.label,
        hint: { text: copy.options.CSV.hint },
        label: { classes: 'govuk-!-font-weight-bold' },
        checked: false
      }
    ])
  })

  it('prefills GET from the saved input method', async () => {
    const result = await drive(get, {
      seed: { commodityInputMethod: 'CSV' }
    })

    expect(result.view.context.values).toEqual({ commodityInputMethod: 'CSV' })
    expect(
      result.view.context.inputMethodOptions.map(({ checked }) => checked)
    ).toEqual([false, true])
  })

  it('returns 400 with the canonical error and commits nothing for an empty POST', async () => {
    const result = await drive(post, {
      payload: { commodityInputMethod: '' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      commodityInputMethod: copy.errors.required
    })
    expect(result.view.context.values).toEqual({ commodityInputMethod: '' })
    expect(result.after).toEqual({})
  })

  it.each(['csv', 'garbage'])(
    'rejects crafted value %s through the same 400 path',
    async (craftedValue) => {
      const result = await drive(post, {
        payload: { commodityInputMethod: craftedValue }
      })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors).toEqual({
        commodityInputMethod: copy.errors.required
      })
      expect(result.view.context.values).toEqual({
        commodityInputMethod: craftedValue
      })
      expect(result.after).toEqual({})
    }
  )

  it.each(['MANUAL', 'CSV'])(
    'commits %s and redirects through nextTarget',
    async (inputMethod) => {
      const nextTarget = vi
        .spyOn(kit, 'nextTarget')
        .mockResolvedValue('/plant-products/notifications/next-target')
      const result = await drive(post, {
        payload: { commodityInputMethod: inputMethod }
      })

      expect(result.after).toEqual({ commodityInputMethod: inputMethod })
      expect(result.response).toEqual({
        redirect: '/plant-products/notifications/next-target'
      })
      expect(nextTarget).toHaveBeenCalledOnce()
    }
  )

  it('renders the submitted value and recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const result = await drive(post, {
      payload: { commodityInputMethod: 'CSV' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.values).toEqual({ commodityInputMethod: 'CSV' })
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual({})
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(
      drive(post, { payload: { commodityInputMethod: 'MANUAL' } })
    ).rejects.toThrow('programming failure')
  })
})
