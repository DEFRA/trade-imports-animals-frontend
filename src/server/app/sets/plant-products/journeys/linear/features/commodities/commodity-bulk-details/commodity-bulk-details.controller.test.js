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

import * as state from '../../../../../../../engine/index.js'
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
import { copy as featureCopy } from '../copy/copy.en.js'
import * as commodityBulkDetails from './commodity-bulk-details.controller.js'

const copy = featureCopy.commodityBulkDetails
const get = commodityBulkDetails.routes.find(
  ({ method }) => method === 'GET'
).handler
const post = postHandlerOf(commodityBulkDetails)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const speciesFor = (code) =>
  code === '06011010'
    ? {
        eppoCode: 'ABWBR',
        genusAndSpecies: 'Albuca bracteata',
        speciesId: '1325967'
      }
    : code === '08059000'
      ? {
          eppoCode: 'CIDAC',
          genusAndSpecies: 'Citrus australasica',
          speciesId: '1364882'
        }
      : {
          eppoCode: 'LENCU',
          genusAndSpecies: 'Lens culinaris',
          speciesId: '1346687'
        }

const line = (code, overrides = {}) => ({
  commoditySelection: code,
  species: [speciesFor(code)],
  numberOfPackages: 10,
  packageType: 'BOX',
  quantity: 20.5,
  quantityType: 'PIECES',
  netWeight: 30.25,
  controlledAtmosphereContainer: false,
  intendedForFinalUsers: true,
  testAndTrial: false,
  ...(code === '06011010' ? { finishedOrPropagated: 'FINISHED' } : {}),
  ...overrides
})

const payloadFor = (lines) =>
  Object.fromEntries(
    lines.flatMap((entry, index) => [
      [`numberOfPackages-${index}`, String(entry.numberOfPackages)],
      [`packageType-${index}`, entry.packageType],
      [`quantity-${index}`, String(entry.quantity)],
      [`quantityType-${index}`, entry.quantityType],
      [`netWeight-${index}`, String(entry.netWeight)],
      [
        `controlledAtmosphereContainer-${index}`,
        String(entry.controlledAtmosphereContainer)
      ],
      [`finishedOrPropagated-${index}`, entry.finishedOrPropagated ?? ''],
      [`intendedForFinalUsers-${index}`, String(entry.intendedForFinalUsers)],
      [`testAndTrial-${index}`, entry.testAndTrial ? 'true' : '']
    ])
  )

describe('plant-products commodity-bulk-details controller', () => {
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

  afterEach(() => vi.restoreAllMocks())

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })

  it('gets state once and prefills every fixture-backed line control and total', async () => {
    const getState = vi.spyOn(state, 'get')
    const seed = {
      commodityLines: [line('06011010'), line('06042090')]
    }
    const result = await drive(get, { seed })

    expect(getState).toHaveBeenCalledOnce()
    expect(result.view.context.lines).toHaveLength(2)
    expect(result.view.context.lines[0]).toMatchObject({
      context: '06011010 Hyacinths',
      showFinishedOrPropagated: true,
      values: {
        numberOfPackages: '10',
        packageType: 'BOX',
        quantity: '20.5',
        quantityType: 'PIECES',
        netWeight: '30.25',
        controlledAtmosphereContainer: 'false',
        finishedOrPropagated: 'FINISHED',
        intendedForFinalUsers: 'true',
        testAndTrial: 'false'
      }
    })
    expect(result.view.context.lines[1]).toMatchObject({
      context: '06042090 Other',
      showFinishedOrPropagated: false
    })
    expect(result.view.context.lines[0].packageTypeItems).toHaveLength(24)
    expect(result.view.context.lines[0].quantityTypeItems).toHaveLength(8)
    expect(result.view.context.totals).toEqual({
      packages: 20,
      netWeight: 60.5
    })
  })

  it('applies only filled values to a non-zero selected line and preserves every sibling cell', async () => {
    const seed = {
      commodityLines: [
        line('06042090', { numberOfPackages: 1, quantity: 1 }),
        line('06011010', { numberOfPackages: 2, quantity: 2 }),
        line('08059000', { numberOfPackages: 3, quantity: 3 })
      ]
    }
    const result = await drive(post, {
      seed,
      payload: {
        action: 'apply',
        selectedLines: '1',
        'bulk-numberOfPackages': '77',
        'bulk-quantity': '12.125'
      }
    })

    expect(result.after.commodityLines[0]).toEqual(seed.commodityLines[0])
    expect(result.after.commodityLines[1]).toEqual({
      ...seed.commodityLines[1],
      numberOfPackages: 77,
      quantity: 12.125
    })
    expect(result.after.commodityLines[2]).toEqual(seed.commodityLines[2])
    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/commodity-bulk-details$/
    )
  })

  it('applies a filled value to every explicitly selected line but not the unselected line', async () => {
    const seed = {
      commodityLines: [
        line('06042090', { netWeight: 1 }),
        line('06011010', { netWeight: 2 }),
        line('08059000', { netWeight: 3 })
      ]
    }
    const result = await drive(post, {
      seed,
      payload: {
        action: 'apply',
        selectedLines: ['1', '2'],
        'bulk-netWeight': '9.5'
      }
    })

    expect(result.after.commodityLines[0]).toEqual(seed.commodityLines[0])
    expect(result.after.commodityLines[1]).toEqual({
      ...seed.commodityLines[1],
      netWeight: 9.5
    })
    expect(result.after.commodityLines[2]).toEqual({
      ...seed.commodityLines[2],
      netWeight: 9.5
    })
  })

  it('applies select all to every exact line and copies rather than apportions', async () => {
    const seed = {
      commodityLines: [
        line('06042090', { numberOfPackages: 1 }),
        line('06011010', { numberOfPackages: 2 }),
        line('08059000', { numberOfPackages: 3 })
      ]
    }
    const result = await drive(post, {
      seed,
      payload: {
        action: 'apply',
        selectedLines: 'all',
        'bulk-numberOfPackages': '8'
      }
    })

    expect(
      result.after.commodityLines.map(
        ({ numberOfPackages }) => numberOfPackages
      )
    ).toEqual([8, 8, 8])
    expect(result.after.commodityLines[0]).toEqual({
      ...seed.commodityLines[0],
      numberOfPackages: 8
    })
    expect(result.after.commodityLines[1]).toEqual({
      ...seed.commodityLines[1],
      numberOfPackages: 8
    })
    expect(result.after.commodityLines[2]).toEqual({
      ...seed.commodityLines[2],
      numberOfPackages: 8
    })
  })

  it.each([
    ['negative', '-1'],
    ['non-integer', '0.5'],
    ['out-of-range', '2'],
    ['forged alongside select all', ['all', '99']]
  ])(
    'refuses a %s bulk target before any write',
    async (_name, selectedLines) => {
      const seed = { commodityLines: [line('06042090'), line('06011010')] }
      const result = await drive(post, {
        seed,
        payload: {
          action: 'apply',
          selectedLines,
          'bulk-numberOfPackages': '4'
        }
      })

      expect(result.response.statusCode).toBe(400)
      expect(result.after).toEqual(seed)
    }
  )

  it.each([
    [
      'number of packages',
      'bulk-numberOfPackages',
      '1.5',
      'numberOfPackagesWhole'
    ],
    ['package type', 'bulk-packageType', 'FORGED'],
    ['quantity', 'bulk-quantity', '1.2345', 'quantityFormat'],
    ['quantity type', 'bulk-quantityType', 'FORGED'],
    ['net weight', 'bulk-netWeight', '0', 'netWeightMin'],
    ['controlled atmosphere', 'bulk-controlledAtmosphereContainer', 'FORGED']
  ])(
    'validates a filled bulk %s before any write',
    async (_name, field, raw, errorKey) => {
      const seed = { commodityLines: [line('06042090'), line('06011010')] }
      const result = await drive(post, {
        seed,
        payload: { action: 'apply', selectedLines: '1', [field]: raw }
      })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[field]).toEqual(
        errorKey ? copy.errors[errorKey] : expect.any(String)
      )
      expect(result.after).toEqual(seed)
    }
  )

  it('rejects bulk apply with no selected line and preserves every line', async () => {
    const seed = { commodityLines: [line('06042090'), line('06011010')] }
    const result = await drive(post, {
      seed,
      payload: { action: 'apply', 'bulk-numberOfPackages': '4' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.selectedLines).toBe(
      copy.errors.selectLine
    )
    expect(result.after).toEqual(seed)
  })

  it('rejects bulk apply when all six values are empty and preserves every line', async () => {
    const seed = { commodityLines: [line('06042090'), line('06011010')] }
    const result = await drive(post, {
      seed,
      payload: { action: 'apply', selectedLines: '1' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors['bulk-numberOfPackages']).toBe(
      copy.errors.fillOneField
    )
    expect(result.after).toEqual(seed)
  })

  it('clears only transient bulk values and leaves every stored line unchanged', async () => {
    const seed = { commodityLines: [line('06042090'), line('06011010')] }
    const result = await drive(post, {
      seed,
      payload: {
        action: 'clear',
        selectedLines: '1',
        'bulk-numberOfPackages': '99'
      }
    })

    expect(result.response.statusCode).toBe(200)
    expect(result.view.context.bulk.values).toEqual({
      'bulk-numberOfPackages': '',
      'bulk-packageType': '',
      'bulk-quantity': '',
      'bulk-quantityType': '',
      'bulk-netWeight': '',
      'bulk-controlledAtmosphereContainer': ''
    })
    expect(result.after).toEqual(seed)
  })

  it.each([
    [
      'number of packages required',
      'numberOfPackages-0',
      '',
      'numberOfPackagesRequired'
    ],
    [
      'number of packages whole',
      'numberOfPackages-0',
      '1.5',
      'numberOfPackagesWhole'
    ],
    ['package type required', 'packageType-0', '', 'packageTypeRequired'],
    ['quantity required', 'quantity-0', '', 'quantityRequired'],
    ['quantity format', 'quantity-0', '1.2345', 'quantityFormat'],
    ['quantity type required', 'quantityType-0', '', 'quantityTypeRequired'],
    ['net weight required', 'netWeight-0', '', 'netWeightRequired'],
    ['net weight minimum', 'netWeight-0', '0', 'netWeightMin'],
    ['net weight decimals', 'netWeight-0', '1.2345', 'netWeightDecimals'],
    [
      'net weight digits',
      'netWeight-0',
      '12345678901234.567',
      'netWeightDigits'
    ]
  ])(
    'returns the canonical %s error with raw values and no write',
    async (_name, field, raw, errorKey) => {
      const seed = { commodityLines: [line('06042090')] }
      const payload = { ...payloadFor(seed.commodityLines), [field]: raw }
      const result = await drive(post, { seed, payload })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[field]).toBe(copy.errors[errorKey])
      expect(result.view.context.lines[0].values[field.replace('-0', '')]).toBe(
        raw
      )
      expect(result.after).toEqual(seed)
    }
  )

  it('requires finished or propagated only for the fixture-flagged line', async () => {
    const seed = {
      commodityLines: [line('06042090'), line('06011010')]
    }
    const payload = payloadFor(seed.commodityLines)
    payload['finishedOrPropagated-1'] = ''
    const result = await drive(post, { seed, payload })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors['finishedOrPropagated-1']).toBe(
      copy.errors.finishedOrPropagatedRequired
    )
    expect(result.view.context.lines[0].showFinishedOrPropagated).toBe(false)
    expect(result.view.context.lines[1].showFinishedOrPropagated).toBe(true)
    expect(result.after).toEqual(seed)
  })

  it('saves cleaned values on the non-zero line and preserves all other lines cell by cell', async () => {
    const seed = {
      commodityLines: [line('06042090'), line('06011010'), line('08059000')]
    }
    const payload = payloadFor(seed.commodityLines)
    payload['numberOfPackages-1'] = ' 42 '
    payload['quantity-1'] = '12.125'
    payload['netWeight-1'] = '7.5'
    payload['controlledAtmosphereContainer-1'] = 'true'
    payload['finishedOrPropagated-1'] = 'PROPAGATED'
    payload['intendedForFinalUsers-1'] = 'false'
    payload['testAndTrial-1'] = 'true'
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(post, { seed, payload })

    expect(result.after.commodityLines[0]).toEqual(seed.commodityLines[0])
    expect(result.after.commodityLines[1]).toEqual({
      ...seed.commodityLines[1],
      numberOfPackages: 42,
      quantity: 12.125,
      netWeight: 7.5,
      controlledAtmosphereContainer: true,
      finishedOrPropagated: 'PROPAGATED',
      intendedForFinalUsers: false,
      testAndTrial: true
    })
    expect(result.after.commodityLines[2]).toEqual(seed.commodityLines[2])
    expect(result.response.redirect).toBe(
      '/plant-products/notifications/next-target'
    )
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('does not validate or commit finishedOrPropagated for an unflagged non-zero line', async () => {
    const seed = {
      commodityLines: [
        line('06011010'),
        line('06042090', { finishedOrPropagated: 'PROPAGATED' })
      ]
    }
    const payload = payloadFor(seed.commodityLines)
    payload['finishedOrPropagated-1'] = 'FORGED'
    const result = await drive(post, { seed, payload })

    expect(result.after.commodityLines[0]).toEqual(seed.commodityLines[0])
    expect(result.after.commodityLines[1]).toEqual(
      Object.fromEntries(
        Object.entries(seed.commodityLines[1]).filter(
          ([name]) => name !== 'finishedOrPropagated'
        )
      )
    )
  })

  it.each([
    ['negative', 'numberOfPackages--1'],
    ['non-integer', 'quantity-0.5'],
    ['out-of-range', 'netWeight-2']
  ])(
    'refuses a %s forged line index before any write',
    async (_name, field) => {
      const seed = { commodityLines: [line('06042090'), line('06011010')] }
      const result = await drive(post, {
        seed,
        payload: { ...payloadFor(seed.commodityLines), [field]: '99' }
      })

      expect(result.response.statusCode).toBe(400)
      expect(result.after).toEqual(seed)
    }
  )

  it('lets a hub exit win after saving valid line values', async () => {
    const seed = { commodityLines: [line('06042090')] }
    const nextTarget = vi.spyOn(kit, 'nextTarget')
    const result = await drive(post, {
      seed,
      payload: { ...payloadFor(seed.commodityLines), exit: 'hub' }
    })

    expect(result.response.redirect).toMatch(
      /^\/plant-products\/notifications\/[^/]+$/
    )
    expect(nextTarget).not.toHaveBeenCalled()
  })

  it('renders raw values and a recoverable error at 500 without writing', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const seed = { commodityLines: [line('06042090')] }
    const payload = payloadFor(seed.commodityLines)
    payload['numberOfPackages-0'] = '44'
    const result = await drive(post, { seed, payload })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.lines[0].values.numberOfPackages).toBe('44')
    expect(result.after).toEqual(seed)
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )
    const seed = { commodityLines: [line('06042090')] }

    await expect(
      drive(post, { seed, payload: payloadFor(seed.commodityLines) })
    ).rejects.toThrow('programming failure')
  })
})
