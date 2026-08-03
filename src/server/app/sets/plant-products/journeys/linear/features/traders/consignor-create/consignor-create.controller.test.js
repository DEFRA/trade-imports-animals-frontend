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
import { projectAnswers } from '../../../../../../../bridge/fulfilments/index.js'
import { plantProducts } from '../../../../../../../routes-plant-products.js'
import * as kit from '../../../../../../../shared/kit.js'
import {
  enterSetContext,
  withSetContext
} from '../../../../../../../shared/set-context.js'
import * as obligations from '../../../../../obligations/index.js'
import { records } from '../../../../../services/records/stub.js'
import { toDto } from '../../../../../services/records/mapper/to-dto.js'
import { evaluationBindings } from '../evaluation.js'
import { copy } from '../copy/copy.en.js'
import * as consignorCreate from './consignor-create.controller.js'

const pageCopy = copy.consignorCreate
const get = consignorCreate.routes.find(
  ({ method }) => method === 'GET'
).handler
const post = postHandlerOf(consignorCreate)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const validPayload = (overrides = {}) => ({
  consignorName: '  Orchard Export SAS  ',
  consignorAddressLine1: '  12 Rue des Vergers  ',
  consignorAddressLine2: '  Building B  ',
  consignorAddressLine3: '  Export Quarter  ',
  consignorCity: '  Lyon  ',
  consignorPostcode: '  69001  ',
  consignorTelephone: '  +33 4 72 00 00 00  ',
  consignorCountry: 'FR',
  consignorEmail: '  exports@example.com  ',
  ...overrides
})

const cleanedAnswers = {
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

const expectedConsignorDto = {
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
}

describe('plant-products consignor-create controller', () => {
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

  it('binds all nine fields to the manifest exports by object identity in the one traders bundle', () => {
    expect(evaluationBindings.name).toBe('traders')
    for (const field of consignorCreate.meta.collects) {
      const binding = evaluationBindings.bindings.find(
        (candidate) => candidate.field === field
      )
      expect(binding?.obligation).toBe(obligations[field])
    }
  })

  it('prefills all nine values from one state read', async () => {
    const result = await drive(get, { seed: cleanedAnswers })

    expect(result.view.context.values).toEqual(cleanedAnswers)
    expect(result.view.context.countryItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'IE', text: 'Republic of Ireland' }),
        expect.objectContaining({ value: 'GB-ENG', text: 'England' }),
        expect.objectContaining({ text: '──────────', disabled: true })
      ])
    )
  })

  it('does not persist a half-entered consignor when the page is abandoned before POST', async () => {
    const result = await drive(get, {})
    const stored = await records.load({ journeyId: result.journeyId })

    expect(result.after).toEqual({})
    expect(toDto(stored.fulfilment)).not.toHaveProperty('consignor')
  })

  it.each([
    {
      name: 'requires the consignor name',
      overrides: { consignorName: '' },
      field: 'consignorName',
      message: pageCopy.errors.consignorName.required
    },
    {
      name: 'limits the consignor name to 255 characters',
      overrides: { consignorName: 'N'.repeat(256) },
      field: 'consignorName',
      message: pageCopy.errors.consignorName.max
    },
    {
      name: 'requires address line 1',
      overrides: { consignorAddressLine1: '' },
      field: 'consignorAddressLine1',
      message: pageCopy.errors.consignorAddressLine1.required
    },
    {
      name: 'limits address line 1 to 255 characters',
      overrides: { consignorAddressLine1: 'A'.repeat(256) },
      field: 'consignorAddressLine1',
      message: pageCopy.errors.consignorAddressLine1.max
    },
    {
      name: 'limits address line 2 to 255 characters',
      overrides: { consignorAddressLine2: 'A'.repeat(256) },
      field: 'consignorAddressLine2',
      message: pageCopy.errors.consignorAddressLine2.max
    },
    {
      name: 'limits address line 3 to 255 characters',
      overrides: { consignorAddressLine3: 'A'.repeat(256) },
      field: 'consignorAddressLine3',
      message: pageCopy.errors.consignorAddressLine3.max
    },
    {
      name: 'requires the city or town',
      overrides: { consignorCity: '' },
      field: 'consignorCity',
      message: pageCopy.errors.consignorCity.required
    },
    {
      name: 'limits the city or town to 58 characters',
      overrides: { consignorCity: 'C'.repeat(59) },
      field: 'consignorCity',
      message: pageCopy.errors.consignorCity.max
    },
    {
      name: 'limits the postcode or ZIP code to 32 characters',
      overrides: { consignorPostcode: 'P'.repeat(33) },
      field: 'consignorPostcode',
      message: pageCopy.errors.consignorPostcode.max
    },
    {
      name: 'requires a telephone number',
      overrides: { consignorTelephone: '' },
      field: 'consignorTelephone',
      message: pageCopy.errors.consignorTelephone.required
    },
    {
      name: 'limits the telephone number to 30 characters',
      overrides: { consignorTelephone: '1'.repeat(31) },
      field: 'consignorTelephone',
      message: pageCopy.errors.consignorTelephone.max
    },
    {
      name: 'requires a selected country',
      overrides: { consignorCountry: '' },
      field: 'consignorCountry',
      message: pageCopy.errors.consignorCountry.required
    },
    {
      name: 'rejects a forged country code',
      overrides: { consignorCountry: 'ZZ' },
      field: 'consignorCountry',
      message: pageCopy.errors.consignorCountry.required
    },
    {
      name: 'requires an email address',
      overrides: { consignorEmail: '' },
      field: 'consignorEmail',
      message: pageCopy.errors.consignorEmail.required
    },
    {
      name: 'rejects an invalid email address',
      overrides: { consignorEmail: 'not-an-email' },
      field: 'consignorEmail',
      message: pageCopy.errors.consignorEmail.format
    },
    {
      name: 'limits the email address to 255 characters',
      overrides: { consignorEmail: `${'a'.repeat(244)}@example.com` },
      field: 'consignorEmail',
      message: pageCopy.errors.consignorEmail.max
    }
  ])(
    '$name, preserves every raw value and commits nothing',
    async (testCase) => {
      const payload = validPayload(testCase.overrides)
      const result = await drive(post, { payload })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[testCase.field]).toBe(testCase.message)
      expect(result.view.context.values).toEqual(payload)
      expect(result.after).toEqual({})
    }
  )

  it('commits exactly nine cleaned values and persists the exact DTO before confirmation', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/consignor-confirmation')
    const result = await drive(post, { payload: validPayload() })
    const stored = await records.load({ journeyId: result.journeyId })
    const dto = withSetContext('plant-products', () =>
      toDto(projectAnswers(stored.fulfilment))
    )

    expect(result.after).toEqual(cleanedAnswers)
    expect(dto.consignor).toEqual(expectedConsignorDto)
    expect(dto.consignor).not.toHaveProperty('operatorId')
    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/consignor-confirmation'
    })
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('omits empty optional values from the committed answer tree', async () => {
    vi.spyOn(kit, 'nextTarget').mockResolvedValue('/next')
    const result = await drive(post, {
      payload: validPayload({
        consignorAddressLine2: '',
        consignorAddressLine3: '',
        consignorPostcode: ''
      })
    })

    for (const field of [
      'consignorAddressLine2',
      'consignorAddressLine3',
      'consignorPostcode'
    ]) {
      expect(result.after).not.toHaveProperty(field)
    }
  })

  it('renders raw values and a recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const payload = validPayload()
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
