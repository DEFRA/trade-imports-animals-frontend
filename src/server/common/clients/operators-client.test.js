import { vi } from 'vitest'

import {
  operatorsClient,
  toApiOperator,
  fromApiOperator,
  toNotificationOperator,
  toTransporter
} from './operators-client.js'

const mockLoggerError = vi.fn()

vi.mock('../helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: (...args) => mockLoggerError(...args)
  })
}))

vi.mock('../../../config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'tradeImportsOperatorsApi.baseUrl') {
        return 'http://mock-operators'
      }

      if (key === 'tracing.header') {
        return 'x-trace-id'
      }

      return undefined
    })
  }
}))

const traceId = 'trace-123'
const identity = { crn: 'CRN-1', organisationId: 'ORG-9' }

const apiOperator = {
  id: 'op-1',
  operator_type: 'CONSIGNOR',
  name: 'Acme',
  address_line_1: '1 High Street',
  address_line_2: 'Unit 4',
  town: 'Leeds',
  county: 'West Yorkshire',
  postcode: 'LS1 1AA',
  country: 'United Kingdom',
  telephone: '01234567890',
  email: 'acme@example.com',
  crn: 'CRN-1',
  organisation_id: 'ORG-9',
  status: 'ACTIVE',
  created_at: '2026-07-01T00:00:00Z',
  modified_at: '2026-07-02T00:00:00Z'
}

const formOperator = {
  operatorType: 'CONSIGNOR',
  name: 'Acme',
  addressLine1: '1 High Street',
  addressLine2: 'Unit 4',
  city: 'Leeds',
  county: 'West Yorkshire',
  postcode: 'LS1 1AA',
  country: 'United Kingdom',
  telephone: '01234567890',
  email: 'acme@example.com'
}

function lastCall() {
  return fetch.mock.calls.at(-1)
}

function lastBody() {
  return JSON.parse(lastCall()[1].body)
}

describe('#operatorsClient', () => {
  let originalFetch

  beforeEach(() => {
    originalFetch = global.fetch
    global.fetch = vi.fn()
    mockLoggerError.mockClear()
  })

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('listOperators', () => {
    test('sends GET to /operators with search, type and page query and the crn + tracing headers', async () => {
      const page = {
        items: [apiOperator],
        page: 1,
        page_size: 25,
        total_items: 1,
        total_pages: 1
      }

      fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(page)
      })

      const result = await operatorsClient.listOperators(traceId, identity, {
        q: 'acme',
        operatorType: 'CONSIGNOR',
        page: 2
      })

      const [url, options] = lastCall()
      expect(url).toBe(
        'http://mock-operators/operators?q=acme&operator_type=CONSIGNOR&page=2'
      )
      expect(options.method).toBe('GET')
      expect(options.headers['Trade-Imports-Crn']).toBe('CRN-1')
      expect(options.headers['x-trace-id']).toBe(traceId)
      expect(result).toEqual(page)
    })

    test('omits query params that are not provided', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ items: [] })
      })

      await operatorsClient.listOperators(traceId, identity, {})

      expect(lastCall()[0]).toBe('http://mock-operators/operators')
    })

    test('throws an error carrying the status on a non-2xx response (never returns [])', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: vi.fn().mockResolvedValue({})
      })

      await expect(
        operatorsClient.listOperators(traceId, identity, {})
      ).rejects.toMatchObject({ status: 503 })
      expect(mockLoggerError).toHaveBeenCalled()
    })
  })

  describe('getOperator', () => {
    test('sends GET to /operators/{id} with the crn header and returns the operator', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(apiOperator)
      })

      const result = await operatorsClient.getOperator(
        traceId,
        identity,
        'op-1'
      )

      const [url, options] = lastCall()
      expect(url).toBe('http://mock-operators/operators/op-1')
      expect(options.method).toBe('GET')
      expect(options.headers['Trade-Imports-Crn']).toBe('CRN-1')
      expect(result).toEqual(apiOperator)
    })
  })

  describe('createOperator', () => {
    test('POSTs the snake_case body (city mapped to town, country untouched) with both identity headers', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: vi.fn().mockResolvedValue({ ...apiOperator })
      })

      await operatorsClient.createOperator(traceId, identity, formOperator)

      const [url, options] = lastCall()
      expect(url).toBe('http://mock-operators/operators')
      expect(options.method).toBe('POST')
      expect(options.headers['Trade-Imports-Crn']).toBe('CRN-1')
      expect(options.headers['Trade-Imports-Organisation-Id']).toBe('ORG-9')

      const body = lastBody()
      expect(body.town).toBe('Leeds')
      expect(body.city).toBeUndefined()
      expect(body.address_line_1).toBe('1 High Street')
      expect(body.country).toBe('United Kingdom')
    })

    test('a 400 with an errors map throws a validation error keyed by form field names', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({
          errors: {
            town: ['Enter a town or city'],
            address_line_1: ['Enter address line 1']
          }
        })
      })

      await expect(
        operatorsClient.createOperator(traceId, identity, formOperator)
      ).rejects.toMatchObject({
        status: 400,
        validation: {
          fieldErrors: {
            city: { text: 'Enter a town or city' },
            addressLine1: { text: 'Enter address line 1' }
          }
        }
      })
    })

    test('a 400 without an errors map (our own bad request) throws without a validation payload', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: vi.fn().mockResolvedValue({
          title: 'Bad Request',
          detail: 'Missing Trade-Imports-Organisation-Id header'
        })
      })

      const error = await operatorsClient
        .createOperator(traceId, identity, formOperator)
        .catch((e) => e)

      expect(error.status).toBe(400)
      expect(error.validation).toBeUndefined()
    })
  })

  describe('updateOperator', () => {
    test('PUTs to /operators/{id} with the crn header and the snake_case body', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(apiOperator)
      })

      await operatorsClient.updateOperator(
        traceId,
        identity,
        'op-1',
        formOperator
      )

      const [url, options] = lastCall()
      expect(url).toBe('http://mock-operators/operators/op-1')
      expect(options.method).toBe('PUT')
      expect(options.headers['Trade-Imports-Crn']).toBe('CRN-1')
      expect(lastBody().town).toBe('Leeds')
    })
  })

  describe('deleteOperator', () => {
    test('sends DELETE to /operators/{id} with the crn header', async () => {
      fetch.mockResolvedValueOnce({ ok: true, status: 204 })

      await operatorsClient.deleteOperator(traceId, identity, 'op-1')

      const [url, options] = lastCall()
      expect(url).toBe('http://mock-operators/operators/op-1')
      expect(options.method).toBe('DELETE')
      expect(options.headers['Trade-Imports-Crn']).toBe('CRN-1')
    })

    test('throws an error carrying the status on a non-2xx response', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({})
      })

      await expect(
        operatorsClient.deleteOperator(traceId, identity, 'op-1')
      ).rejects.toMatchObject({ status: 404 })
    })
  })
})

describe('operators mapping (c-002 / b-011 boundary)', () => {
  test('toApiOperator maps city to town and leaves country untouched', () => {
    const body = toApiOperator(formOperator)

    expect(body.town).toBe('Leeds')
    expect(body).not.toHaveProperty('city')
    expect(body.operator_type).toBe('CONSIGNOR')
    expect(body.address_line_1).toBe('1 High Street')
    expect(body.country).toBe('United Kingdom')
  })

  test('toApiOperator includes the transporter extras only when present', () => {
    expect(toApiOperator(formOperator)).not.toHaveProperty('approval_number')

    const body = toApiOperator({
      ...formOperator,
      operatorType: 'TRANSPORTER',
      approvalNumber: 'AP-1',
      transporterCategory: 'PRIVATE'
    })
    expect(body.approval_number).toBe('AP-1')
    expect(body.transporter_category).toBe('PRIVATE')
  })

  test('fromApiOperator maps town to city and leaves country untouched', () => {
    const operator = fromApiOperator(apiOperator)

    expect(operator.city).toBe('Leeds')
    expect(operator).not.toHaveProperty('town')
    expect(operator.id).toBe('op-1')
    expect(operator.addressLine1).toBe('1 High Street')
    expect(operator.organisationId).toBe('ORG-9')
    expect(operator.country).toBe('United Kingdom')
  })

  test('toNotificationOperator produces the camelCase party shape with operatorId and city', () => {
    const party = toNotificationOperator(apiOperator)

    expect(party).toEqual({
      operatorId: 'op-1',
      name: 'Acme',
      addressLine1: '1 High Street',
      addressLine2: 'Unit 4',
      city: 'Leeds',
      county: 'West Yorkshire',
      postcode: 'LS1 1AA',
      country: 'United Kingdom',
      telephone: '01234567890',
      email: 'acme@example.com'
    })
  })

  test('toTransporter adds approvalNumber and type on top of the party shape', () => {
    const transporter = toTransporter({
      ...apiOperator,
      operator_type: 'TRANSPORTER',
      approval_number: 'AP-1',
      transporter_category: 'COMMERCIAL'
    })

    expect(transporter.operatorId).toBe('op-1')
    expect(transporter.city).toBe('Leeds')
    expect(transporter.approvalNumber).toBe('AP-1')
    expect(transporter.type).toBe('COMMERCIAL')
    expect(transporter.country).toBe('United Kingdom')
  })

  test('country is passed through untranslated in every direction (c-004 pin)', () => {
    const country = 'Côte d’Ivoire'

    expect(toApiOperator({ ...formOperator, country }).country).toBe(country)
    expect(fromApiOperator({ ...apiOperator, country }).country).toBe(country)
    expect(toNotificationOperator({ ...apiOperator, country }).country).toBe(
      country
    )
  })
})
