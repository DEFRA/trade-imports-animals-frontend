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
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'

vi.mock('../../common/clients/operators-client.js')

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

function sessionAuth(sessionId) {
  return {
    strategy: 'session',
    credentials: { user: {}, sessionId }
  }
}

const apiOperator = {
  id: 'op-1',
  operator_type: 'CONSIGNOR',
  name: 'Tampere Horse Transport',
  address_line_1: '12 Dock Road',
  town: 'Hull',
  postcode: 'HU1 1AA',
  country: 'Finland'
}

describe('GET /address-book (rendered search + type filter)', () => {
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
    operatorsClient.listOperators.mockReset()
    operatorsClient.listOperators.mockResolvedValue({
      items: [apiOperator],
      page: 1,
      page_size: 25,
      total_items: 1,
      total_pages: 1
    })
  })

  test('repopulates the search box with the submitted q', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book?q=acme',
      auth: sessionAuth('address-book-search-q')
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('#address-book-search').attr('value')).toBe('acme')
  })

  test('renders the "All" default option and selects the submitted operator type', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/address-book?operator_type=CONSIGNOR',
      auth: sessionAuth('address-book-filter-type')
    })

    const $ = load(result)
    const firstOption = $('#operator-type-filter option').first()
    expect(firstOption.text().trim()).toBe('All')
    expect($('#operator-type-filter option[selected]').attr('value')).toBe(
      'CONSIGNOR'
    )
  })

  test('uses a plain GET form with no client-side live-filtering script (c-012)', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/address-book',
      auth: sessionAuth('address-book-no-client-js')
    })

    const $ = load(result)
    const form = $('form[role="search"]')
    expect(form.attr('method')).toBe('get')
    const search = $('#address-book-search')
    expect(search.attr('oninput')).toBeUndefined()
    expect(search.attr('onkeyup')).toBeUndefined()
    expect(search.attr('data-module')).toBeUndefined()
  })

  test('the search form omits page, so refining a search resets to page 1', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/address-book?q=horse&page=3',
      auth: sessionAuth('address-book-reset-page')
    })

    const $ = load(result)
    expect($('form[role="search"] input[name="page"]').length).toBe(0)
  })

  test('pagination links on a filtered result carry the q and operator_type filters', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: [apiOperator],
      page: 1,
      page_size: 25,
      total_items: 30,
      total_pages: 2
    })

    const { result } = await server.inject({
      method: 'GET',
      url: '/address-book?q=horse&operator_type=CONSIGNOR',
      auth: sessionAuth('address-book-filtered-pagination')
    })

    const $ = load(result)
    const hrefs = $('.govuk-pagination__link')
      .map((_, el) => $(el).attr('href'))
      .get()

    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) {
      expect(href).toContain('q=horse')
      expect(href).toContain('operator_type=CONSIGNOR')
    }
  })
})
