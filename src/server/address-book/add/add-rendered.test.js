import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'
import { load } from 'cheerio'
import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { operatorsClient } from '../../common/clients/operators-client.js'
import { countriesClient } from '../../common/clients/countries-client.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'

vi.mock('../../common/clients/operators-client.js')

vi.mock('../../common/clients/countries-client.js', () => ({
  countriesClient: { getCountries: vi.fn() }
}))

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const countries = [
  { code: 'FI', name: 'Finland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

function sessionAuth(sessionId) {
  return {
    strategy: 'session',
    credentials: { user: {}, sessionId }
  }
}

const validPayload = {
  operatorType: 'CONSIGNOR',
  name: 'Tampere Horse Transport',
  addressLine1: '12 Dock Road',
  addressLine2: '',
  city: 'Hull',
  county: '',
  postcode: 'HU1 1AA',
  country: 'Finland',
  telephone: '01234 567890',
  email: 'ops@tampere.example'
}

function sessionCookieFrom(response) {
  const cookies = response.headers['set-cookie']
  if (!cookies) {
    return null
  }
  return cookies[0].split(';')[0]
}

describe('Add-an-operator flow (rendered DOM)', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    operatorsClient.createOperator.mockReset()
    operatorsClient.createOperator.mockResolvedValue({ id: 'op-9' })
    operatorsClient.listOperators.mockReset()
    operatorsClient.listOperators.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 25,
      total_items: 0,
      total_pages: 1
    })
    countriesClient.getCountries.mockReset()
    countriesClient.getCountries.mockResolvedValue(countries)
  })

  describe('GET /address-book/add (type selection)', () => {
    test('renders the seven operator types in Jira order with a visible "or" divider before Branch address', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/address-book/add',
        auth: sessionAuth('add-type-render')
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)

      const radioValues = $('input[name="operatorType"]')
        .map((_, el) => $(el).attr('value'))
        .get()
      expect(radioValues).toEqual([
        'PLACE_OF_ORIGIN',
        'CONSIGNOR',
        'CONSIGNEE',
        'IMPORTER',
        'PLACE_OF_DESTINATION',
        'TRANSPORTER',
        'BRANCH_ADDRESS'
      ])

      const divider = $('.govuk-radios__divider')
      expect(divider.length).toBe(1)
      expect(divider.text().trim()).toBe('or')
    })
  })

  describe('GET /address-book/add/details', () => {
    test('renders the two h2 sections, the full-MDM country select and the optional County label', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/address-book/add/details?operator_type=CONSIGNOR',
        auth: sessionAuth('add-details-render')
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)

      const headings = $('h2')
        .map((_, el) => $(el).text().trim())
        .get()
      expect(headings).toContain('Enter address details')
      expect(headings).toContain('Enter contact details')

      const countryValues = $('#country option')
        .map((_, el) => $(el).attr('value'))
        .get()
      expect(countryValues).toEqual(['', 'Finland', 'United Kingdom', 'France'])

      const countyLabel = $('label[for="county"]').text().trim()
      expect(countyLabel).toContain('(optional)')
    })

    test('renders the conditional transporter fields for a TRANSPORTER type (c-019)', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/address-book/add/details?operator_type=TRANSPORTER',
        auth: sessionAuth('add-details-transporter')
      })

      const $ = load(result)
      expect($('#approvalNumber').length).toBe(1)
      const categoryValues = $('input[name="transporterCategory"]')
        .map((_, el) => $(el).attr('value'))
        .get()
      expect(categoryValues).toEqual(['PRIVATE', 'COMMERCIAL'])
    })

    test('does NOT render the transporter fields for a non-TRANSPORTER type (c-019)', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/address-book/add/details?operator_type=CONSIGNOR',
        auth: sessionAuth('add-details-consignor')
      })

      const $ = load(result)
      expect($('#approvalNumber').length).toBe(0)
      expect($('input[name="transporterCategory"]').length).toBe(0)
    })

    test('the save button carries data-prevent-double-click (contract D3)', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/address-book/add/details?operator_type=CONSIGNOR',
        auth: sessionAuth('add-details-double-click')
      })

      const $ = load(result)
      const saveButton = $('button:contains("Save changes")')
      expect(saveButton.attr('data-prevent-double-click')).toBe('true')
    })
  })

  describe('success banner (b-005/c-006/c-016)', () => {
    test('a valid submit sets the flash and the list then renders a persistent success banner naming the operator', async () => {
      const post = await server.inject({
        method: 'POST',
        url: '/address-book/add/details',
        auth: sessionAuth('add-banner-post'),
        payload: { ...validPayload }
      })

      expect(post.statusCode).toBe(statusCodes.redirectFound)
      expect(post.headers.location).toBe('/address-book')

      const cookie = sessionCookieFrom(post)
      expect(cookie).toBeTruthy()

      const list = await server.inject({
        method: 'GET',
        url: '/address-book',
        auth: sessionAuth('add-banner-post'),
        headers: { cookie }
      })

      const $ = load(list.result)
      const banner = $('.govuk-notification-banner--success')
      expect(banner.length).toBe(1)
      expect(banner.text()).toContain('Tampere Horse Transport operator added')
    })
  })
})
