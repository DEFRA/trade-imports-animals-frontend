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
    'renders the first page of five unchecked rows on a new notification with $name',
    async ({ mode }) => {
      vi.stubEnv('PLANT_PRODUCTS_MODE', mode)
      const picker = pickerFrom(await drive(get))

      expect(picker.rows).toHaveLength(5)
      expect(picker.rows.map(({ checked }) => checked)).toEqual(
        Array(5).fill(false)
      )
      expect(picker.selected).toBeUndefined()
      expect(picker.rows[0]).toMatchObject({
        id: 'example-consignor-01',
        idPrefix: 'party',
        name: 'Example Consignor 01 (sample data)',
        country: 'France'
      })
      expect(picker.resultsCaption).toBe(pageCopy.resultsCaption(5, 12))
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
      await drive(get, { query: { selected: 'example-consignor-03' } })
    )

    expect(picker.selected.id).toBe('example-consignor-03')
    expect(
      picker.rows.filter(({ checked }) => checked).map(({ id }) => id)
    ).toEqual(['example-consignor-03'])
  })

  it('names a selection made on another page even though no row here is checked', async () => {
    const picker = pickerFrom(
      await drive(get, { query: { selected: 'example-consignor-07' } })
    )

    expect(picker.selected.id).toBe('example-consignor-07')
    expect(picker.rows.filter(({ checked }) => checked)).toEqual([])
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

  it('renders the tail of the list for page three and offers no next link', async () => {
    const picker = pickerFrom(await drive(get, { query: { page: '3' } }))

    expect(picker.page).toBe(3)
    expect(picker.rows.map(({ id }) => id)).toEqual([
      'example-consignor-11',
      'example-consignor-12'
    ])
    expect(picker.rows[0].idPrefix).toBe('party')
    expect(picker.rows[1].idPrefix).toBe('party-12')
    expect(picker.pagination.next).toBeUndefined()
    expect(picker.pagination.previous.href).toContain('page=2')
  })

  it('falls back to page one for a page beyond the end', async () => {
    const picker = pickerFrom(await drive(get, { query: { page: '99' } }))

    expect(picker.page).toBe(1)
    expect(picker.rows[0].id).toBe('example-consignor-01')
  })

  it('renders three pages of the canned catalogue and marks the current one', async () => {
    const picker = pickerFrom(await drive(get, { query: { page: '2' } }))

    expect(picker.pagination.items.map(({ number }) => number)).toEqual([
      1, 2, 3
    ])
    expect(
      picker.pagination.items.filter(({ current }) => current)
    ).toHaveLength(1)
  })

  it('carries an active search into every pagination link on a GET', async () => {
    const picker = pickerFrom(
      await drive(get, { query: { q: 'Example Business Park', page: '2' } })
    )

    expect(picker.query).toBe('Example Business Park')
    expect(picker.rows.map(({ id }) => id)).toEqual([
      'example-consignor-06',
      'example-consignor-07',
      'example-consignor-08',
      'example-consignor-09',
      'example-consignor-10'
    ])

    const hrefs = [
      picker.pagination.previous.href,
      picker.pagination.next.href,
      ...picker.pagination.items
        .filter(({ href }) => href)
        .map(({ href }) => href)
    ]

    for (const href of hrefs) {
      expect(href).toContain('q=Example+Business+Park')
      expect(href).toContain('page=')
    }
  })

  it('filters the rows on a search POST and commits nothing', async () => {
    const result = await drive(post, {
      payload: { action: 'search', q: 'GB-SCT' }
    })
    const picker = pickerFrom(result)

    expect(picker.query).toBe('GB-SCT')
    expect(picker.rows.map(({ id }) => id)).toEqual(['example-consignor-12'])
    expect(picker.resultsCaption).toBe(pageCopy.resultsCaption(1, 1))
    expect(picker.pagination).toBeNull()
    expect(result.after).toEqual({})
    expect(result.response.statusCode).toBe(200)
  })

  it('re-renders a search that matches nothing without a table or a commit', async () => {
    const result = await drive(post, {
      payload: { action: 'search', q: 'no such trader' }
    })

    expect(pickerFrom(result).rows).toEqual([])
    expect(pickerFrom(result).resultsCaption).toBe(
      pageCopy.resultsCaption(0, 0)
    )
    expect(result.after).toEqual({})
  })

  it('carries the incoming selection through a search that excludes it', async () => {
    const result = await drive(post, {
      payload: {
        action: 'search',
        q: 'GB-SCT',
        selected: 'example-consignor-01'
      }
    })

    expect(pickerFrom(result).selected.id).toBe('example-consignor-01')
    expect(pickerFrom(result).page).toBe(1)
    expect(result.after).toEqual({})
  })

  it('commits a record chosen on another page than the one posted from', async () => {
    const result = await drive(post, {
      payload: { page: '1', selected: 'example-consignor-12' }
    })

    expect(result.after.consignorName).toBe(
      'Example Consignor 12 (sample data)'
    )
    expect(result.after.consignorCountry).toBe('GB-SCT')
    expect(result.response).toEqual({
      redirect: `/plant-products/notifications/${result.journeyId}/traders-addresses`
    })
  })

  it('keeps the query and the page on the no-selection 400', async () => {
    const result = await drive(post, {
      payload: { q: 'Example Business Park', page: '2' }
    })
    const picker = pickerFrom(result)

    expect(result.response.statusCode).toBe(400)
    expect(picker.query).toBe('Example Business Park')
    expect(picker.page).toBe(2)
    expect(picker.rows.map(({ id }) => id)).toEqual([
      'example-consignor-06',
      'example-consignor-07',
      'example-consignor-08',
      'example-consignor-09',
      'example-consignor-10'
    ])
    expect(result.after).toEqual({})
  })

  it('anchors the summary at the search input when the query leaves no rows', async () => {
    const result = await drive(post, { payload: { q: 'no such trader' } })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: pageCopy.errors.required, href: '#q' }
    ])
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
