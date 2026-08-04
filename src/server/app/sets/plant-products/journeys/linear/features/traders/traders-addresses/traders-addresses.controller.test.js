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
import {
  countryOptions,
  ukSubdivisionOptions
} from '../../../../../services/reference/countries.js'
import { placeholderOrganisationOperator } from '../../../../../services/placeholder-org.js'
import {
  destinationAddressLine1,
  destinationAddressLine2,
  destinationAddressLine3,
  destinationCity,
  destinationCountry,
  destinationName,
  destinationPostcode,
  destinationSameAsConsignee
} from '../../../../../obligations/index.js'
import * as tradersAddresses from './traders-addresses.controller.js'
import { copy } from '../copy/copy.en.js'

const pageCopy = copy.tradersAddresses
const get = tradersAddresses.routes.find(
  ({ method }) => method === 'GET'
).handler
const post = postHandlerOf(tradersAddresses)
const drive = (handler, options) =>
  withSetContext('plant-products', () => driveHandler(handler, options))

const validEnteredPayload = (overrides = {}) => ({
  destinationSameAsConsignee: 'false',
  destinationName: 'Paris Produce Market',
  destinationAddressLine1: '10 Rue des Plantes',
  destinationAddressLine2: 'Building 2',
  destinationAddressLine3: 'Wholesale Quarter',
  destinationCity: 'Paris',
  destinationPostcode: '75001',
  destinationCountry: 'FR',
  packerName: 'Packing SARL',
  packerAddressLine1: '20 Rue du Colis',
  packerAddressLine2: 'Unit 4',
  packerAddressLine3: '',
  packerCity: 'Calais',
  packerPostcode: '62100',
  packerCountry: 'FR',
  ...overrides
})

describe('plant-products traders-addresses controller', () => {
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

  it('gates every destination leaf through the manifest radio object identity', () => {
    for (const obligation of [
      destinationName,
      destinationAddressLine1,
      destinationAddressLine2,
      destinationAddressLine3,
      destinationCity,
      destinationPostcode,
      destinationCountry
    ]) {
      expect(obligation.applyTo.metadata).toMatchObject({
        type: 'equalsGate',
        obligation: destinationSameAsConsignee.id,
        value: false
      })
    }
  })

  it('prefills both party forms, the radio and importer summary from one state read', async () => {
    const result = await drive(get, {
      seed: {
        destinationSameAsConsignee: false,
        destinationName: 'Paris Produce Market',
        destinationAddressLine1: '10 Rue des Plantes',
        destinationAddressLine2: 'Building 2',
        destinationAddressLine3: 'Wholesale Quarter',
        destinationCity: 'Paris',
        destinationPostcode: '75001',
        destinationCountry: 'FR',
        packerName: 'Packing SARL',
        packerAddressLine1: '20 Rue du Colis',
        packerAddressLine2: 'Unit 4',
        packerAddressLine3: '',
        packerCity: 'Calais',
        packerPostcode: '62100',
        packerCountry: 'FR'
      }
    })

    expect(result.view.context.values).toEqual(validEnteredPayload())
    expect(result.view.context.importerRows).toEqual([
      {
        key: { text: pageCopy.importer.rows.name },
        value: { text: placeholderOrganisationOperator().name }
      },
      expect.objectContaining({
        key: { text: pageCopy.importer.rows.address }
      }),
      {
        key: { text: pageCopy.importer.rows.country },
        value: { text: 'England' }
      }
    ])
    expect(result.view.context.consignorHref).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/consignor-create$/
    )
  })

  it('renders the persisted consignor name on return from confirmation', async () => {
    const result = await drive(get, {
      seed: { consignorName: 'Orchard Export SAS' }
    })

    expect(result.view.context.consignorName).toBe('Orchard Export SAS')
  })

  it('offers and accepts UK subdivisions from the same country vocabulary', async () => {
    const offered = await drive(get, {})
    const expectedCodes = [...ukSubdivisionOptions(), ...countryOptions()].map(
      ({ value }) => value
    )

    for (const items of [
      offered.view.context.destinationCountryItems,
      offered.view.context.packerCountryItems
    ]) {
      expect(
        items
          .filter(({ disabled, value }) => !disabled && value)
          .map(({ value }) => value)
      ).toEqual(expectedCodes)
      expect(items).toContainEqual({
        value: '',
        text: '──────────',
        disabled: true
      })
    }

    vi.spyOn(kit, 'nextTarget').mockResolvedValue(
      '/plant-products/notifications/next-target'
    )
    const accepted = await drive(post, {
      payload: validEnteredPayload({
        destinationCountry: 'GB-ENG',
        packerCountry: 'GB-SCT'
      })
    })

    expect(accepted.after).toMatchObject({
      destinationCountry: 'GB-ENG',
      packerCountry: 'GB-SCT'
    })
    expect(accepted.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
  })

  it.each([
    {
      name: 'requires the delivery-address radio',
      overrides: { destinationSameAsConsignee: '' },
      field: 'destinationSameAsConsignee',
      message: pageCopy.errors.destinationSameAsConsignee
    },
    {
      name: 'requires the delivery name on No',
      overrides: { destinationName: '' },
      field: 'destinationName',
      message: pageCopy.errors.destinationName
    },
    {
      name: 'requires delivery address line 1 on No',
      overrides: { destinationAddressLine1: '' },
      field: 'destinationAddressLine1',
      message: pageCopy.errors.destinationAddressLine1
    },
    {
      name: 'requires the delivery town or city on No',
      overrides: { destinationCity: '' },
      field: 'destinationCity',
      message: pageCopy.errors.destinationCity
    },
    {
      name: 'requires the delivery postcode on No',
      overrides: { destinationPostcode: '' },
      field: 'destinationPostcode',
      message: pageCopy.errors.destinationPostcode
    },
    {
      name: 'requires the delivery country on No',
      overrides: { destinationCountry: '' },
      field: 'destinationCountry',
      message: pageCopy.errors.destinationCountry
    },
    {
      name: 'rejects a genuinely forged delivery country through the canonical error',
      overrides: { destinationCountry: 'XX-FORGED' },
      field: 'destinationCountry',
      message: pageCopy.errors.destinationCountry
    }
  ])(
    '$name, preserves every raw value and commits nothing',
    async (testCase) => {
      const payload = validEnteredPayload(testCase.overrides)
      const result = await drive(post, { payload })

      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[testCase.field]).toBe(testCase.message)
      expect(result.view.context.values).toEqual(payload)
      expect(result.after).toEqual({})
    }
  )

  it('commits cleaned entered destination and packer values and redirects', async () => {
    const nextTarget = vi
      .spyOn(kit, 'nextTarget')
      .mockResolvedValue('/plant-products/notifications/next-target')
    const result = await drive(post, {
      payload: validEnteredPayload({
        destinationName: '  Paris Produce Market  ',
        packerName: '  Packing SARL  '
      })
    })

    expect(result.after).toEqual({
      destinationSameAsConsignee: false,
      destinationName: 'Paris Produce Market',
      destinationAddressLine1: '10 Rue des Plantes',
      destinationAddressLine2: 'Building 2',
      destinationAddressLine3: 'Wholesale Quarter',
      destinationCity: 'Paris',
      destinationPostcode: '75001',
      destinationCountry: 'FR',
      packerName: 'Packing SARL',
      packerAddressLine1: '20 Rue du Colis',
      packerAddressLine2: 'Unit 4',
      packerCity: 'Calais',
      packerPostcode: '62100',
      packerCountry: 'FR'
    })
    expect(result.response).toEqual({
      redirect: '/plant-products/notifications/next-target'
    })
    expect(nextTarget).toHaveBeenCalledOnce()
  })

  it('saves with all packer fields empty and does not create packer answers', async () => {
    vi.spyOn(kit, 'nextTarget').mockResolvedValue(
      '/plant-products/notifications/next-target'
    )
    const result = await drive(post, {
      payload: validEnteredPayload({
        packerName: '',
        packerAddressLine1: '',
        packerAddressLine2: '',
        packerAddressLine3: '',
        packerCity: '',
        packerPostcode: '',
        packerCountry: ''
      })
    })

    expect(result.after).toMatchObject({
      destinationSameAsConsignee: false,
      destinationName: 'Paris Produce Market'
    })
    for (const field of tradersAddresses.meta.collects.filter((field) =>
      field.startsWith('packer')
    )) {
      expect(result.after).not.toHaveProperty(field)
    }
  })

  it('never commits submitted destination leaves when Yes is selected', async () => {
    vi.spyOn(kit, 'nextTarget').mockResolvedValue(
      '/plant-products/notifications/next-target'
    )
    const result = await drive(post, {
      payload: validEnteredPayload({ destinationSameAsConsignee: 'true' })
    })

    expect(result.after.destinationSameAsConsignee).toBe(true)
    for (const field of tradersAddresses.meta.collects.filter(
      (field) =>
        field.startsWith('destination') &&
        field !== 'destinationSameAsConsignee'
    )) {
      expect(result.after).not.toHaveProperty(field)
    }
  })

  it('purges every gated destination leaf on No to Yes and keeps them empty after Yes to No', async () => {
    vi.spyOn(kit, 'nextTarget').mockResolvedValue(
      '/plant-products/notifications/next-target'
    )
    const destinationAnswers = {
      destinationSameAsConsignee: false,
      destinationName: 'Paris Produce Market',
      destinationAddressLine1: '10 Rue des Plantes',
      destinationAddressLine2: 'Building 2',
      destinationAddressLine3: 'Wholesale Quarter',
      destinationCity: 'Paris',
      destinationPostcode: '75001',
      destinationCountry: 'FR'
    }
    const yes = await drive(post, {
      seed: destinationAnswers,
      payload: validEnteredPayload({ destinationSameAsConsignee: 'true' })
    })

    expect(yes.after).toMatchObject({ destinationSameAsConsignee: true })
    for (const field of Object.keys(destinationAnswers).filter(
      (field) => field !== 'destinationSameAsConsignee'
    )) {
      expect(yes.after).not.toHaveProperty(field)
    }

    const reopened = await drive(get, {
      seed: { destinationSameAsConsignee: false }
    })
    for (const field of Object.keys(destinationAnswers).filter(
      (field) => field !== 'destinationSameAsConsignee'
    )) {
      expect(reopened.view.context.values[field]).toBe('')
    }
  })

  it('renders raw values and a recoverable error at 500', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const payload = validEnteredPayload({
      destinationName: '  Paris Produce Market  '
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

    await expect(
      drive(post, { payload: validEnteredPayload() })
    ).rejects.toThrow('programming failure')
  })
})
