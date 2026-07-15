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
      credentials: { profile: { crn: 'CRN123', organisationId: 'ORG1' } }
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
