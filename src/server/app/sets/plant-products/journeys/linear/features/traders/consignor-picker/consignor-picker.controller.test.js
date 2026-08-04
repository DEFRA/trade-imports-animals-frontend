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

import { projectAnswers } from '../../../../../../../bridge/fulfilments/index.js'
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
import { readSelection } from '../../../../../services/address-book/session-store.js'
import { records } from '../../../../../services/records/stub.js'
import { toDto } from '../../../../../services/records/mapper/to-dto.js'
import { copy } from '../copy/copy.en.js'
import * as consignorPicker from './consignor-picker.controller.js'

const pageCopy = copy.consignorPicker
const get = consignorPicker.routes.find(
  ({ method }) => method === 'GET'
).handler
const post = postHandlerOf(consignorPicker)
const sessionYar = () => {
  const values = new Map()
  return {
    get: (key) => values.get(key),
    set: (key, value) => values.set(key, value)
  }
}

const drive = (handler, options, yar = sessionYar()) =>
  withSetContext('plant-products', () =>
    driveHandler((request, h) => handler({ ...request, yar }, h), options)
  )

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

const firstCannedAnswers = {
  consignorName: 'Example Consignor 01 (sample data)',
  consignorAddressLine1: '1 Example Street',
  consignorAddressLine2: 'Example Business Park',
  consignorAddressLine3: 'Example District',
  consignorCity: 'Example City',
  consignorPostcode: 'ZZ99 01',
  consignorTelephone: '01632 960001',
  consignorCountry: 'FR',
  consignorEmail: 'consignor01@example.com'
}

const pickerFrom = (result) => result.view.context.picker

describe('plant-products consignor-picker controller', () => {
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

  it('claims no obligation of its own', () => {
    expect(consignorPicker.meta.collects).toEqual([])
  })

  it.each([
    { name: 'PLANT_PRODUCTS_MODE unset', mode: undefined },
    { name: 'PLANT_PRODUCTS_MODE=stub', mode: 'stub' }
  ])(
    'renders twelve unchecked rows on a new notification with $name',
    async ({ mode }) => {
      vi.stubEnv('PLANT_PRODUCTS_MODE', mode)
      const picker = pickerFrom(await drive(get))

      expect(picker.rows).toHaveLength(12)
      expect(picker.rows.map(({ checked }) => checked)).toEqual(
        Array(12).fill(false)
      )
      expect(picker.selected).toBeUndefined()
      expect(picker.rows[0]).toMatchObject({
        id: 'example-consignor-01',
        idPrefix: 'party',
        name: 'Example Consignor 01 (sample data)',
        country: 'France'
      })
      expect(picker.resultsCaption).toBe(pageCopy.resultsCaption(12, 12))
      expect(picker.createConsignorHref).toMatch(
        /^\/plant-products\/notifications\/[^/]+\/consignor-create$/
      )
    }
  )

  it('pre-checks the consignor already on the notification', async () => {
    const picker = pickerFrom(await drive(get, { seed: consignorAnswers }))

    expect(picker.rows[0]).toMatchObject({
      id: 'notification-consignor',
      name: 'Orchard Export SAS',
      checked: true
    })
    expect(picker.selected.id).toBe('notification-consignor')
  })

  it('pre-checks the row named by the selected query parameter', async () => {
    const picker = pickerFrom(
      await drive(get, { query: { selected: 'example-consignor-07' } })
    )

    expect(picker.selected.id).toBe('example-consignor-07')
    expect(
      picker.rows.filter(({ checked }) => checked).map(({ id }) => id)
    ).toEqual(['example-consignor-07'])
  })

  it('back-links to traders-addresses', async () => {
    const result = await drive(get)

    expect(result.view.context.backLink).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/traders-addresses$/
    )
  })

  it('rejects a POST with nothing selected at 400 and links the summary to the radio group', async () => {
    const result = await drive(post, { payload: {} })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: pageCopy.errors.required, href: '#party' }
    ])
    expect(pickerFrom(result).error).toBe(pageCopy.errors.required)
    expect(result.after).toEqual({})
  })

  it('rejects a POST naming a record that is not a candidate', async () => {
    const result = await drive(post, {
      payload: { party: 'example-consignor-99' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.after).toEqual({})
  })

  it('commits exactly the nine flat consignor leaves and returns to traders-addresses', async () => {
    const result = await drive(post, {
      payload: { party: 'example-consignor-01' }
    })

    expect(result.after).toEqual(firstCannedAnswers)
    expect(result.after.consignorTelephone).toBe('01632 960001')
    expect(result.after.consignorEmail).toBe('consignor01@example.com')
    expect(result.after.consignorCountry).toBe('FR')
    for (const banned of [
      'consignor',
      'county',
      'townOrCity',
      'postalOrZipCode',
      'operatorId'
    ]) {
      expect(result.after).not.toHaveProperty(banned)
    }
    expect(result.response).toEqual({
      redirect: `/plant-products/notifications/${result.journeyId}/traders-addresses`
    })
  })

  it('persists the picked consignor into the same DTO shape the form writes', async () => {
    const result = await drive(post, {
      payload: { party: 'example-consignor-01' }
    })
    const stored = await records.load({ journeyId: result.journeyId })
    const dto = withSetContext('plant-products', () =>
      toDto(projectAnswers(stored.fulfilment))
    )

    expect(dto.consignor).toEqual({
      name: 'Example Consignor 01 (sample data)',
      telephone: '01632 960001',
      email: 'consignor01@example.com',
      address: {
        addressLine1: '1 Example Street',
        addressLine2: 'Example Business Park',
        addressLine3: 'Example District',
        city: 'Example City',
        postcode: 'ZZ99 01',
        country: 'FR'
      }
    })
    expect(dto.consignor).not.toHaveProperty('operatorId')
  })

  it('drops a blank optional line rather than committing an empty string', async () => {
    const result = await drive(post, {
      seed: {
        consignorName: 'Half Entered Ltd',
        consignorAddressLine1: '1 Example Street',
        consignorCity: 'Example City',
        consignorTelephone: '01632 960111',
        consignorCountry: 'FR',
        consignorEmail: 'half@example.com'
      },
      payload: { party: 'notification-consignor' }
    })

    for (const optional of [
      'consignorAddressLine2',
      'consignorAddressLine3',
      'consignorPostcode'
    ]) {
      expect(result.after).not.toHaveProperty(optional)
    }
  })

  it('omits the mandatory contact leaves rather than blanking them', async () => {
    const result = await drive(post, {
      seed: {
        consignorName: 'No Contact Ltd',
        consignorAddressLine1: '1 Example Street',
        consignorCity: 'Example City',
        consignorCountry: 'FR'
      },
      payload: { party: 'notification-consignor' }
    })

    expect(result.after.consignorTelephone).not.toBe('')
    expect(result.after.consignorEmail).not.toBe('')
  })

  it('lets a hub exit win over the traders-addresses return', async () => {
    const result = await drive(post, {
      payload: { party: 'example-consignor-01', exit: 'hub' }
    })

    expect(result.response).toEqual({
      redirect: `/plant-products/notifications/${result.journeyId}`
    })
  })

  it('records the chosen id in the session so the picker pre-selects it on return', async () => {
    const yar = sessionYar()
    const result = await drive(
      post,
      { payload: { party: 'example-consignor-05' } },
      yar
    )

    expect(readSelection({ yar }, result.journeyId)).toBe(
      'example-consignor-05'
    )
  })

  it('re-renders the picked state at 500 on a recoverable persistence failure', async () => {
    vi.spyOn(kit, 'recoverableSave').mockImplementationOnce(
      async (_save, onRecoverableFailure) => ({
        failure: await onRecoverableFailure()
      })
    )
    const result = await drive(post, {
      payload: { party: 'example-consignor-01' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(pickerFrom(result).selected.id).toBe('example-consignor-01')
    expect(result.after).toEqual({})
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(
      drive(post, { payload: { party: 'example-consignor-01' } })
    ).rejects.toThrow('programming failure')
  })
})
