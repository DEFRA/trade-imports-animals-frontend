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
import { copy } from '../copy/copy.en.js'
import * as originOfImport from './origin-of-import.controller.js'

const get = originOfImport.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(originOfImport)
const pageCopy = copy.originOfImport
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

describe('plant-products origin-of-import controller', () => {
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

  it('prefills both fields and supplies canonical country options on GET', async () => {
    const result = await drive(get, {
      seed: { countryOfConsignment: 'IE', internalReference: 'REF-123' }
    })
    const { countryItems, values } = result.view.context
    const ukGroup = countryItems.find(({ items }) => items)

    expect(values).toEqual({
      countryOfConsignment: 'IE',
      internalReference: 'REF-123'
    })
    expect(countryItems[0]).toEqual({
      value: '',
      text: pageCopy.countryOfConsignment.placeholder
    })
    expect(countryItems).toContainEqual({
      value: 'IE',
      text: 'Republic of Ireland'
    })
    expect(ukGroup.items.map(({ value }) => value)).toEqual([
      'GB-ENG',
      'GB-SCT',
      'GB-WLS',
      'GB-NIR'
    ])
  })

  it('returns 400 for an empty country and preserves both raw values', async () => {
    const result = await drive(post, {
      payload: {
        countryOfConsignment: '',
        internalReference: '  RAW REF  '
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      countryOfConsignment: pageCopy.errors.countryOfConsignmentRequired
    })
    expect(result.view.context.values).toEqual({
      countryOfConsignment: '',
      internalReference: '  RAW REF  '
    })
    expect(result.after).toEqual({})
  })

  it('rejects a country label instead of its reference-data code', async () => {
    const result = await drive(post, {
      payload: { countryOfConsignment: 'France', internalReference: '' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.countryOfConsignment).toBe(
      pageCopy.errors.countryOfConsignmentRequired
    )
    expect(result.view.context.values.countryOfConsignment).toBe('France')
    expect(result.after).toEqual({})
  })

  it('rejects an internal reference of 31 characters with the exact message', async () => {
    const result = await drive(post, {
      payload: {
        countryOfConsignment: 'FR',
        internalReference: 'R'.repeat(31)
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.internalReference).toBe(
      'Internal reference number must be 30 characters or fewer'
    )
    expect(result.view.context.values.internalReference).toBe('R'.repeat(31))
    expect(result.after).toEqual({})
  })

  it('accepts a blank optional internal reference', async () => {
    const result = await drive(post, {
      payload: { countryOfConsignment: 'IE', internalReference: '' }
    })

    expect(result.after).toEqual({
      countryOfConsignment: 'IE',
      internalReference: ''
    })
  })

  it('accepts the 30-character internal reference boundary', async () => {
    const internalReference = 'R'.repeat(30)
    const result = await drive(post, {
      payload: { countryOfConsignment: 'IE', internalReference }
    })

    expect(result.after).toEqual({
      countryOfConsignment: 'IE',
      internalReference
    })
  })

  it('commits exactly cleaned values and redirects through nextTarget', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(post, {
      payload: {
        countryOfConsignment: '  FR  ',
        internalReference: '  REF-123  '
      }
    })

    expect(result.after).toEqual({
      countryOfConsignment: 'FR',
      internalReference: 'REF-123'
    })
    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('renders raw submitted values and recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const result = await drive(post, {
      payload: {
        countryOfConsignment: 'GB-ENG',
        internalReference: 'REF-123'
      }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.values).toEqual({
      countryOfConsignment: 'GB-ENG',
      internalReference: 'REF-123'
    })
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual({})
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(
      drive(post, {
        payload: { countryOfConsignment: 'FR', internalReference: '' }
      })
    ).rejects.toThrow('programming failure')
  })
})
