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

const SUITE = 'plant-products consignor-picker controller'
const SET_ID = 'plant-products'

const CONSIGNOR_01_ID = 'example-consignor-01'
const CONSIGNOR_03_ID = 'example-consignor-03'
const CONSIGNOR_07_ID = 'example-consignor-07'
const CONSIGNOR_12_ID = 'example-consignor-12'
const NOTIFICATION_CONSIGNOR_ID = 'notification-consignor'
const CONSIGNOR_01_NAME = 'Example Consignor 01 (sample data)'
const CONSIGNOR_01_TELEPHONE = '01632 960001'
const CONSIGNOR_01_EMAIL = 'consignor01@example.com'
const EXAMPLE_ADDRESS_LINE_1 = '1 Example Street'
const EXAMPLE_ADDRESS_LINE_2 = 'Example Business Park'
const EXAMPLE_CITY = 'Example City'

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
  withSetContext(SET_ID, () =>
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
  consignorName: CONSIGNOR_01_NAME,
  consignorAddressLine1: EXAMPLE_ADDRESS_LINE_1,
  consignorAddressLine2: EXAMPLE_ADDRESS_LINE_2,
  consignorAddressLine3: 'Example District',
  consignorCity: EXAMPLE_CITY,
  consignorPostcode: 'ZZ99 01',
  consignorTelephone: CONSIGNOR_01_TELEPHONE,
  consignorCountry: 'FR',
  consignorEmail: CONSIGNOR_01_EMAIL
}

const pickerFrom = (result) => result.view.context.picker

const setupConsignorPickerSuite = () => {
  let server

  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    server = Hapi.server()
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
  })

  beforeEach(async () => {
    enterSetContext(SET_ID)
    await records.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })
}

describe(`${SUITE} — the list as rendered`, () => {
  setupConsignorPickerSuite()

  it('claims no obligation of its own', () => {
    expect(consignorPicker.meta.collects).toEqual([])
  })

  it.each([
    { name: 'PLANT_PRODUCTS_MODE unset' },
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
        id: CONSIGNOR_01_ID,
        idPrefix: 'party',
        name: CONSIGNOR_01_NAME,
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
      id: NOTIFICATION_CONSIGNOR_ID,
      name: 'Orchard Export SAS',
      checked: true
    })
    expect(picker.selected.id).toBe(NOTIFICATION_CONSIGNOR_ID)
  })

  it('pre-checks the row named by the selected query parameter', async () => {
    const picker = pickerFrom(
      await drive(get, { query: { selected: CONSIGNOR_03_ID } })
    )

    expect(picker.selected.id).toBe(CONSIGNOR_03_ID)
    expect(
      picker.rows.filter(({ checked }) => checked).map(({ id }) => id)
    ).toEqual([CONSIGNOR_03_ID])
  })

  it('names a selection made on another page even though no row here is checked', async () => {
    const picker = pickerFrom(
      await drive(get, { query: { selected: CONSIGNOR_07_ID } })
    )

    expect(picker.selected.id).toBe(CONSIGNOR_07_ID)
    expect(picker.rows.filter(({ checked }) => checked)).toEqual([])
  })

  it('back-links to traders-addresses', async () => {
    const result = await drive(get)

    expect(result.view.context.backLink).toMatch(
      /^\/plant-products\/notifications\/[^/]+\/traders-addresses$/
    )
  })
})

describe(`${SUITE} — choosing and committing a consignor`, () => {
  setupConsignorPickerSuite()

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
      payload: { party: CONSIGNOR_01_ID }
    })

    expect(result.after).toEqual(firstCannedAnswers)
    expect(result.after.consignorTelephone).toBe(CONSIGNOR_01_TELEPHONE)
    expect(result.after.consignorEmail).toBe(CONSIGNOR_01_EMAIL)
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
      payload: { party: CONSIGNOR_01_ID }
    })
    const stored = await records.load({ journeyId: result.journeyId })
    const dto = withSetContext(SET_ID, () =>
      toDto(projectAnswers(stored.fulfilment))
    )

    expect(dto.consignor).toEqual({
      name: CONSIGNOR_01_NAME,
      telephone: CONSIGNOR_01_TELEPHONE,
      email: CONSIGNOR_01_EMAIL,
      address: {
        addressLine1: EXAMPLE_ADDRESS_LINE_1,
        addressLine2: EXAMPLE_ADDRESS_LINE_2,
        addressLine3: 'Example District',
        city: EXAMPLE_CITY,
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
        consignorAddressLine1: EXAMPLE_ADDRESS_LINE_1,
        consignorCity: EXAMPLE_CITY,
        consignorTelephone: '01632 960111',
        consignorCountry: 'FR',
        consignorEmail: 'half@example.com'
      },
      payload: { party: NOTIFICATION_CONSIGNOR_ID }
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
        consignorAddressLine1: EXAMPLE_ADDRESS_LINE_1,
        consignorCity: EXAMPLE_CITY,
        consignorCountry: 'FR'
      },
      payload: { party: NOTIFICATION_CONSIGNOR_ID }
    })

    expect(result.after.consignorTelephone).not.toBe('')
    expect(result.after.consignorEmail).not.toBe('')
  })

  it('lets a hub exit win over the traders-addresses return', async () => {
    const result = await drive(post, {
      payload: { party: CONSIGNOR_01_ID, exit: 'hub' }
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
      payload: { party: CONSIGNOR_01_ID }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(pickerFrom(result).selected.id).toBe(CONSIGNOR_01_ID)
    expect(result.after).toEqual({})
  })

  it('allows unexpected persistence errors to throw', async () => {
    vi.spyOn(kit, 'recoverableSave').mockRejectedValueOnce(
      new TypeError('programming failure')
    )

    await expect(
      drive(post, { payload: { party: CONSIGNOR_01_ID } })
    ).rejects.toThrow('programming failure')
  })
})

describe(`${SUITE} — paging and search`, () => {
  setupConsignorPickerSuite()

  it('renders the tail of the list for page three and offers no next link', async () => {
    const picker = pickerFrom(await drive(get, { query: { page: '3' } }))

    expect(picker.page).toBe(3)
    expect(picker.rows.map(({ id }) => id)).toEqual([
      'example-consignor-11',
      CONSIGNOR_12_ID
    ])
    expect(picker.rows[0].idPrefix).toBe('party')
    expect(picker.rows[1].idPrefix).toBe('party-12')
    expect(picker.pagination.next).toBeUndefined()
    expect(picker.pagination.previous.href).toContain('page=2')
  })

  it('falls back to page one for a page beyond the end', async () => {
    const picker = pickerFrom(await drive(get, { query: { page: '99' } }))

    expect(picker.page).toBe(1)
    expect(picker.rows[0].id).toBe(CONSIGNOR_01_ID)
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
      await drive(get, { query: { q: EXAMPLE_ADDRESS_LINE_2, page: '2' } })
    )

    expect(picker.query).toBe(EXAMPLE_ADDRESS_LINE_2)
    expect(picker.rows.map(({ id }) => id)).toEqual([
      'example-consignor-06',
      CONSIGNOR_07_ID,
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
    expect(picker.rows.map(({ id }) => id)).toEqual([CONSIGNOR_12_ID])
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
        selected: CONSIGNOR_01_ID
      }
    })

    expect(pickerFrom(result).selected.id).toBe(CONSIGNOR_01_ID)
    expect(pickerFrom(result).page).toBe(1)
    expect(result.after).toEqual({})
  })

  it('commits a record chosen on another page than the one posted from', async () => {
    const result = await drive(post, {
      payload: { page: '1', selected: CONSIGNOR_12_ID }
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
      payload: { q: EXAMPLE_ADDRESS_LINE_2, page: '2' }
    })
    const picker = pickerFrom(result)

    expect(result.response.statusCode).toBe(400)
    expect(picker.query).toBe(EXAMPLE_ADDRESS_LINE_2)
    expect(picker.page).toBe(2)
    expect(picker.rows.map(({ id }) => id)).toEqual([
      'example-consignor-06',
      CONSIGNOR_07_ID,
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
})
