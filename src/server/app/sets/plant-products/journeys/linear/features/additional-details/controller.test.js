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
import { records } from '../../../../services/records/stub.js'
import * as additionalDetails from './controller.js'
import { copy } from './copy/copy.en.js'

const get = additionalDetails.routes.find(
  ({ method }) => method === 'GET'
).handler
const post = postHandlerOf(additionalDetails)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const validPayload = (overrides = {}) => ({
  totalGrossWeight: '12',
  grossVolume: '5',
  grossVolumeUnit: 'LITRES',
  ...overrides
})

describe('plant-products additional-details controller', () => {
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

  it('prefills persisted measurements with at least two decimal places and derives both totals', async () => {
    const result = await drive(get, {
      seed: {
        totalGrossWeight: 12.5,
        grossVolume: 8,
        grossVolumeUnit: 'METRES_CUBED',
        commodityLines: [
          { netWeight: '1', numberOfPackages: '2' },
          { netWeight: '10', numberOfPackages: '3' }
        ]
      }
    })

    expect(result.view.context.values).toEqual({
      totalGrossWeight: '12.50',
      grossVolume: '8.00',
      grossVolumeUnit: 'METRES_CUBED'
    })
    expect(result.view.context.netWeightTotal).toBe(11)
    expect(result.view.context.packagesTotal).toBe(5)
    expect(
      result.view.context.grossVolumeUnitItems.map(({ value }) => value)
    ).toEqual(['', 'LITRES', 'METRES_CUBED'])
  })

  it('renders zero derived totals when there are no commodity lines', async () => {
    const result = await drive(get)

    expect(result.view.context.netWeightTotal).toBe(0)
    expect(result.view.context.packagesTotal).toBe(0)
  })

  it.each([
    {
      name: 'requires total gross weight',
      overrides: { totalGrossWeight: '' },
      field: 'totalGrossWeight',
      message: copy.errors.totalGrossWeightRequired,
      raw: ''
    },
    {
      name: 'rejects non-numeric total gross weight',
      overrides: { totalGrossWeight: 'not-a-number' },
      field: 'totalGrossWeight',
      message: copy.errors.totalGrossWeightNumber,
      raw: 'not-a-number'
    },
    {
      name: 'rejects total gross weight with more than 5 decimal places',
      overrides: { totalGrossWeight: '12.123456' },
      field: 'totalGrossWeight',
      message: copy.errors.totalGrossWeightDecimalPlaces,
      raw: '12.123456'
    },
    {
      name: 'rejects non-numeric gross volume',
      overrides: { grossVolume: 'raw-volume' },
      field: 'grossVolume',
      message: copy.errors.grossVolumeNumber,
      raw: 'raw-volume'
    },
    {
      name: 'requires volume when a unit is posted',
      overrides: { grossVolume: '', grossVolumeUnit: 'LITRES' },
      field: 'grossVolume',
      message: copy.errors.grossVolumeRequiredWithUnit,
      raw: ''
    },
    {
      name: 'requires a unit when volume is posted',
      overrides: { grossVolume: '5', grossVolumeUnit: '' },
      field: 'grossVolumeUnit',
      message: copy.errors.grossVolumeUnitRequired,
      raw: ''
    },
    {
      name: 'rejects a unit outside the reference fixture',
      overrides: { grossVolume: '5', grossVolumeUnit: 'FORGED' },
      field: 'grossVolumeUnit',
      message: copy.errors.grossVolumeUnitRequired,
      raw: 'FORGED'
    }
  ])('$name, preserves raw input and commits nothing', async (testCase) => {
    const payload = validPayload(testCase.overrides)
    const result = await drive(post, { payload })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors[testCase.field]).toBe(testCase.message)
    expect(result.view.context.values[testCase.field]).toBe(testCase.raw)
    expect(result.view.context.values).toEqual(payload)
    expect(result.after).toEqual({})
  })

  it('requires gross weight to exceed the derived net-weight total', async () => {
    const seed = {
      commodityLines: [
        { netWeight: '1', numberOfPackages: '2' },
        { netWeight: '10', numberOfPackages: '3' }
      ]
    }
    const payload = validPayload({ totalGrossWeight: '11' })
    const result = await drive(post, { seed, payload })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.totalGrossWeight).toBe(
      copy.errors.totalGrossWeightGreaterThanNet
    )
    expect(result.view.context.values).toEqual(payload)
    expect(result.after).toEqual(seed)
  })

  it('commits cleaned measurements as numbers and redirects through nextTarget', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(post, {
      payload: validPayload({
        totalGrossWeight: ' 12.5 ',
        grossVolume: ' 8 ',
        grossVolumeUnit: ' METRES_CUBED '
      })
    })

    expect(result.after).toEqual({
      totalGrossWeight: 12.5,
      grossVolume: 8,
      grossVolumeUnit: 'METRES_CUBED'
    })
    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('accepts lossless Number boundaries without imposing a magnitude or scale cap', async () => {
    vi.spyOn(kit, 'nextTarget').mockResolvedValue(
      '/plant-products/notifications/next-target'
    )
    const result = await drive(post, {
      payload: validPayload({
        totalGrossWeight: '9007199254740994',
        grossVolume: '0.12345678901234568'
      })
    })

    expect(result.after).toEqual({
      totalGrossWeight: 9007199254740994,
      grossVolume: 0.12345678901234568,
      grossVolumeUnit: 'LITRES'
    })
  })

  it.each([
    {
      name: 'total gross weight',
      field: 'totalGrossWeight',
      value: '9007199254740993.12345',
      message: copy.errors.totalGrossWeightNumber
    },
    {
      name: 'gross volume',
      field: 'grossVolume',
      value: '0.1234567890123456789',
      message: copy.errors.grossVolumeNumber
    }
  ])(
    'rejects the first precision-losing $name value before commit',
    async ({ field, value, message }) => {
      const payload = validPayload({ [field]: value })
      const result = await drive(post, { payload })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[field]).toBe(message)
      expect(result.view.context.values).toEqual(payload)
      expect(result.after).toEqual({})
    }
  )

  it('clearing gross volume takes its unit out of scope and purges the stored unit', async () => {
    vi.spyOn(kit, 'nextTarget').mockResolvedValue(
      '/plant-products/notifications/next-target'
    )
    const result = await drive(post, {
      seed: {
        totalGrossWeight: 12,
        grossVolume: 5,
        grossVolumeUnit: 'LITRES'
      },
      payload: validPayload({ grossVolume: '', grossVolumeUnit: '' })
    })

    expect(result.after).toEqual({ totalGrossWeight: 12 })
    expect(result.after).not.toHaveProperty('grossVolume')
    expect(result.after).not.toHaveProperty('grossVolumeUnit')
  })

  it('renders raw values and a recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const payload = validPayload({ totalGrossWeight: ' 12 ' })
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
