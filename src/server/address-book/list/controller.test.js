import { describe, expect, test, vi, beforeEach } from 'vitest'
import { addressBookListController } from './controller.js'
import { operatorsClient } from '../../common/clients/operators-client.js'

vi.mock('../../common/clients/operators-client.js')

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn().mockReturnValue('test-trace-id')
}))

function mockRequest(query = {}) {
  return {
    query,
    auth: {
      credentials: { crn: 'CRN123', organisationId: 'ORG1' }
    }
  }
}

function mockResponseToolkit() {
  return { view: vi.fn((template, data) => ({ template, data })) }
}

const apiOperator = {
  id: 'op-1',
  operator_type: 'CONSIGNOR',
  name: 'Tampere Horse Transport',
  address_line_1: '12 Dock Road',
  address_line_2: 'Unit 4',
  town: 'Hull',
  county: 'East Yorkshire',
  postcode: 'HU1 1AA',
  country: 'Finland'
}

const otherApiOperator = {
  id: 'op-2',
  operator_type: 'TRANSPORTER',
  name: 'Baltic Livestock Ltd',
  address_line_1: '5 Harbour Way',
  town: 'Grimsby',
  postcode: 'DN31 3AA',
  country: 'United Kingdom'
}

describe('addressBookListController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('renders every operator returned by the client with name, type label, comma-joined address and country', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: [apiOperator, otherApiOperator],
      page: 1,
      page_size: 25,
      total_items: 2,
      total_pages: 1
    })

    const h = mockResponseToolkit()
    const response = await addressBookListController.handler(mockRequest(), h)

    expect(response.template).toBe('address-book/list/index')
    expect(response.data.operators).toEqual([
      {
        name: 'Tampere Horse Transport',
        type: 'Consignor',
        address: '12 Dock Road, Unit 4, Hull, East Yorkshire, HU1 1AA',
        country: 'Finland',
        viewHref: '/address-book/op-1'
      },
      {
        name: 'Baltic Livestock Ltd',
        type: 'Transporter',
        address: '5 Harbour Way, Grimsby, DN31 3AA',
        country: 'United Kingdom',
        viewHref: '/address-book/op-2'
      }
    ])
  })

  test('renders the "Showing start-end of total" counter for the current page', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: Array.from({ length: 5 }, (_, index) => ({
        ...apiOperator,
        id: `op-${index}`
      })),
      page: 2,
      page_size: 25,
      total_items: 30,
      total_pages: 2
    })

    const h = mockResponseToolkit()
    const response = await addressBookListController.handler(
      mockRequest({ page: '2' }),
      h
    )

    expect(response.data.resultsLabel).toBe('Showing 26-30 of 30')
  })

  test('builds numbered pagination whose hrefs preserve the search and type filters', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: [apiOperator],
      page: 1,
      page_size: 25,
      total_items: 30,
      total_pages: 2
    })

    const h = mockResponseToolkit()
    const response = await addressBookListController.handler(
      mockRequest({ q: 'horse', operator_type: 'CONSIGNOR' }),
      h
    )

    for (const item of response.data.pagination.items) {
      expect(item.href).toContain('q=horse')
      expect(item.href).toContain('operator_type=CONSIGNOR')
    }
    expect(response.data.pagination.items[1].href).toContain('page=2')
  })

  test('echoes the search term and selected type back into the view for the plain form GET', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: [apiOperator],
      page: 1,
      page_size: 25,
      total_items: 1,
      total_pages: 1
    })

    const h = mockResponseToolkit()
    const response = await addressBookListController.handler(
      mockRequest({ q: 'horse', operator_type: 'CONSIGNOR' }),
      h
    )

    expect(response.data.q).toBe('horse')
    expect(response.data.operatorType).toBe('CONSIGNOR')
    expect(response.data.operatorTypeOptions).toContainEqual(
      expect.objectContaining({
        value: 'CONSIGNOR',
        text: 'Consignor',
        selected: true
      })
    )
  })

  test('renders an empty address book without inventing rows', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 25,
      total_items: 0,
      total_pages: 1
    })

    const h = mockResponseToolkit()
    const response = await addressBookListController.handler(mockRequest(), h)

    expect(response.data.operators).toEqual([])
    expect(response.data.resultsLabel).toBe('Showing 0 of 0')
    expect(response.data.pagination).toBeNull()
  })

  test('forwards ?q to listOperators as a trimmed search term on page 1', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 25,
      total_items: 0,
      total_pages: 1
    })

    const h = mockResponseToolkit()
    await addressBookListController.handler(mockRequest({ q: 'acme' }), h)

    expect(operatorsClient.listOperators).toHaveBeenCalledWith(
      'test-trace-id',
      { crn: 'CRN123', organisationId: 'ORG1' },
      { q: 'acme', operatorType: undefined, page: 1 }
    )
  })

  test('forwards q, operator_type and page together to listOperators', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: [],
      page: 3,
      page_size: 25,
      total_items: 60,
      total_pages: 3
    })

    const h = mockResponseToolkit()
    await addressBookListController.handler(
      mockRequest({ q: 'horse', operator_type: 'CONSIGNOR', page: '3' }),
      h
    )

    expect(operatorsClient.listOperators).toHaveBeenCalledWith(
      'test-trace-id',
      { crn: 'CRN123', organisationId: 'ORG1' },
      { q: 'horse', operatorType: 'CONSIGNOR', page: 3 }
    )
  })

  test('defaults page to 1 when the query omits it, so a fresh search never lands mid-pagination', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 25,
      total_items: 0,
      total_pages: 1
    })

    const h = mockResponseToolkit()
    await addressBookListController.handler(mockRequest({ q: 'newsearch' }), h)

    expect(operatorsClient.listOperators).toHaveBeenCalledWith(
      'test-trace-id',
      { crn: 'CRN123', organisationId: 'ORG1' },
      expect.objectContaining({ page: 1 })
    )
  })

  test('the operator-type filter offers an "All" default that is selected when no type is filtered', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 25,
      total_items: 0,
      total_pages: 1
    })

    const h = mockResponseToolkit()
    const response = await addressBookListController.handler(mockRequest(), h)

    expect(response.data.operatorTypeOptions[0]).toEqual({
      value: '',
      text: 'All',
      selected: true
    })
  })

  test('the "All" default is not selected once a type filter is applied', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 25,
      total_items: 0,
      total_pages: 1
    })

    const h = mockResponseToolkit()
    const response = await addressBookListController.handler(
      mockRequest({ operator_type: 'TRANSPORTER' }),
      h
    )

    expect(response.data.operatorTypeOptions[0]).toEqual({
      value: '',
      text: 'All',
      selected: false
    })
  })

  test('renders the success banner from the session flash exactly once (one-shot)', async () => {
    operatorsClient.listOperators.mockResolvedValue({
      items: [],
      page: 1,
      page_size: 25,
      total_items: 0,
      total_pages: 1
    })

    const store = {
      addressBookBanner: 'Tampere Horse Transport operator added'
    }
    const yar = {
      get: vi.fn((key, clear) => {
        const value = store[key] ?? null
        if (clear) {
          delete store[key]
        }
        return value
      }),
      set: vi.fn()
    }
    const request = { ...mockRequest(), yar }

    const first = await addressBookListController.handler(
      request,
      mockResponseToolkit()
    )
    expect(first.data.banner).toBe('Tampere Horse Transport operator added')

    const second = await addressBookListController.handler(
      request,
      mockResponseToolkit()
    )
    expect(second.data.banner).toBeNull()
  })

  test('propagates a client failure to the error page instead of rendering an empty table', async () => {
    const outage = new Error('Failed to list operators')
    outage.status = 503
    operatorsClient.listOperators.mockRejectedValue(outage)

    const h = mockResponseToolkit()

    await expect(
      addressBookListController.handler(mockRequest(), h)
    ).rejects.toThrow('Failed to list operators')
    expect(h.view).not.toHaveBeenCalled()
  })
})
