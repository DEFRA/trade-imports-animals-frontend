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
} from '../../../../../../engine/test-support.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import * as kit from '../../../../../../shared/kit.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import { purposeOptions } from '../../../../services/reference/purposes.js'
import { records } from '../../../../services/records/stub.js'
import * as purpose from './controller.js'
import { copy } from './copy/copy.en.js'

const get = purpose.routes.find(({ method }) => method === 'GET').handler
const post = postHandlerOf(purpose)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

describe('plant-products purpose controller', () => {
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

  it('prefills GET and exposes the three canonical options with exactly two hints', async () => {
    const result = await drive(get, {
      seed: { reasonForImport: 'RE_ENTRY' }
    })

    expect(result.view.context.values).toEqual({
      reasonForImport: 'RE_ENTRY'
    })
    expect(result.view.context.reasonOptions).toEqual([
      {
        ...purposeOptions[0],
        hint: { text: copy.reasonHints.INTERNAL_MARKET },
        checked: false
      },
      {
        ...purposeOptions[1],
        hint: { text: copy.reasonHints.RE_ENTRY },
        checked: true
      },
      { ...purposeOptions[2], checked: false }
    ])
  })

  it('returns 400 with the canonical error and commits nothing for an empty POST', async () => {
    const result = await drive(post, {
      payload: { reasonForImport: '' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      reasonForImport: copy.errors.reasonForImportRequired
    })
    expect(result.view.context.values).toEqual({ reasonForImport: '' })
    expect(result.after).toEqual({})
  })

  it('rejects a crafted value outside the canonical enum through the same 400 path', async () => {
    const result = await drive(post, {
      payload: { reasonForImport: 'NOT_A_PURPOSE' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors).toEqual({
      reasonForImport: copy.errors.reasonForImportRequired
    })
    expect(result.view.context.values).toEqual({
      reasonForImport: 'NOT_A_PURPOSE'
    })
    expect(result.after).toEqual({})
  })

  it.each(['internalmarket', 'import', 'reconformity'])(
    'rejects the IPAFFS wire value %s without committing it',
    async (wireValue) => {
      const result = await drive(post, {
        payload: { reasonForImport: wireValue }
      })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors.reasonForImport).toBe(
        copy.errors.reasonForImportRequired
      )
      expect(result.after).toEqual({})
    }
  )

  it('commits the cleaned normalised enum and redirects through nextTarget', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(post, {
      payload: { reasonForImport: '  INTERNAL_MARKET  ' }
    })

    expect(result.after).toEqual({ reasonForImport: 'INTERNAL_MARKET' })
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
      payload: { reasonForImport: 'RE_CONFORMITY_CHECK' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.values).toEqual({
      reasonForImport: 'RE_CONFORMITY_CHECK'
    })
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.after).toEqual({})
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(
      drive(post, { payload: { reasonForImport: 'RE_ENTRY' } })
    ).rejects.toThrow('programming failure')
  })
})
