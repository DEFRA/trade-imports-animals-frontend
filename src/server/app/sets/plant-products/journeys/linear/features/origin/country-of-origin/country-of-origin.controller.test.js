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
import {
  enterSetContext,
  withSetContext
} from '../../../../../../../shared/set-context.js'
import * as kit from '../../../../../../../shared/kit.js'
import { records } from '../../../../../services/records/stub.js'
import { copy } from '../copy/copy.en.js'
import * as countryOfOrigin from './country-of-origin.controller.js'

const get = countryOfOrigin.routes.find(
  ({ method }) => method === 'GET'
).handler
const post = postHandlerOf(countryOfOrigin)
const pageCopy = copy.countryOfOrigin
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

describe('plant-products country-of-origin controller', () => {
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

  it('prefills GET and supplies the canonical country options', async () => {
    const result = await drive(get, {
      seed: { countryOfOrigin: 'IE' }
    })
    const { countryItems, values } = result.view.context
    const ukGroup = countryItems.find(({ items }) => items)

    expect(values).toEqual({ countryOfOrigin: 'IE' })
    expect(countryItems[0]).toEqual({
      value: '',
      text: pageCopy.country.placeholder
    })
    expect(countryItems).toContainEqual({
      value: 'IE',
      text: 'Republic of Ireland'
    })
    expect(ukGroup).toEqual({
      label: pageCopy.country.ukGroupLabel,
      items: [
        { value: 'GB-ENG', text: 'England' },
        { value: 'GB-SCT', text: 'Scotland' },
        { value: 'GB-WLS', text: 'Wales' },
        { value: 'GB-NIR', text: 'Northern Ireland' }
      ]
    })
    expect(countryItems[countryItems.indexOf(ukGroup) - 1]).toEqual({
      value: 'AE',
      text: 'United Arab Emirates'
    })
    expect(countryItems[countryItems.indexOf(ukGroup) + 1]).toEqual({
      value: 'UM',
      text: 'United States Minor Outlying Islands'
    })
  })

  it('returns 400 with the canonical error and commits nothing for an empty POST', async () => {
    const result = await drive(post, {
      payload: { countryOfOrigin: '' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      countryOfOrigin: pageCopy.errors.countryRequired
    })
    expect(result.view.context.values).toEqual({ countryOfOrigin: '' })
    expect(result.after).toEqual({})
  })

  it('rejects a crafted code outside the reference-data list', async () => {
    const result = await drive(post, {
      payload: { countryOfOrigin: 'NOT-A-COUNTRY' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.countryOfOrigin).toBe(
      pageCopy.errors.countryRequired
    )
    expect(result.view.context.values.countryOfOrigin).toBe('NOT-A-COUNTRY')
    expect(result.after).toEqual({})
  })

  it('commits the cleaned country code and redirects through nextTarget', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(post, {
      payload: { countryOfOrigin: '  FR  ' }
    })

    expect(result.after).toEqual({ countryOfOrigin: 'FR' })
    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('renders the submitted value and recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const result = await drive(post, {
      payload: { countryOfOrigin: 'GB-ENG' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.values).toEqual({
      countryOfOrigin: 'GB-ENG'
    })
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual({})
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(
      drive(post, { payload: { countryOfOrigin: 'FR' } })
    ).rejects.toThrow('programming failure')
  })
})
