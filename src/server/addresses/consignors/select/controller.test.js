import { load } from 'cheerio'
import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { createServer } from '../../../server.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { operatorsClient } from '../../../common/clients/operators-client.js'
import { mockOidcConfig } from '../../../common/test-helpers/mock-oidc-config.js'
import * as sessionHelpers from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'

vi.mock('../../../common/clients/operators-client.js')

vi.mock('../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../../../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

vi.mock(
  '../../../common/helpers/session-helpers.js',
  async (importOriginal) => {
    const actual = await importOriginal()
    return {
      ...actual,
      setSessionValue: vi.fn(actual.setSessionValue),
      getSessionValue: vi.fn(actual.getSessionValue)
    }
  }
)

function sessionAuth(sessionId) {
  return {
    strategy: 'session',
    credentials: { user: {}, sessionId, crn: 'CRN123', organisationId: 'ORG1' }
  }
}

const apiConsignor = {
  id: 'op-c1',
  operator_type: 'CONSIGNOR',
  name: 'Tampere Horse Transport',
  address_line_1: '12 Dock Road',
  address_line_2: 'Unit 4',
  town: 'Hull',
  county: 'East Yorkshire',
  postcode: 'HU1 1AA',
  country: 'Finland',
  telephone: '01234 567890',
  email: 'ops@tampere.example'
}

const otherApiConsignor = {
  id: 'op-c2',
  operator_type: 'CONSIGNOR',
  name: 'Baltic Livestock Ltd',
  address_line_1: '5 Harbour Way',
  town: 'Grimsby',
  postcode: 'DN31 3AA',
  country: 'United Kingdom'
}

function mockList(items) {
  operatorsClient.listOperators.mockResolvedValue({
    items,
    page: 1,
    page_size: 25,
    total_items: items.length,
    total_pages: 1
  })
}

describe('#consignorsSelectController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  afterEach(() => {
    sessionHelpers.getSessionValue.mockReset()
    sessionHelpers.setSessionValue.mockClear()
    operatorsClient.listOperators.mockReset()
  })

  describe('GET /consignors/select', () => {
    test('lists only CONSIGNOR operators with the operator id as the radio value', async () => {
      mockList([apiConsignor, otherApiConsignor])

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/consignors/select',
        auth: sessionAuth('consignor-get')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(operatorsClient.listOperators).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        { operatorType: 'CONSIGNOR' }
      )

      const $ = load(result)
      const values = $('input[name="consignor"]')
        .map((_, el) => $(el).attr('value'))
        .get()
      expect(values).toEqual(['op-c1', 'op-c2'])
      expect(result).toContain('Tampere Horse Transport')
      expect(result).toContain('Baltic Livestock Ltd')
    })

    test('pre-selects the radio whose id matches the operatorId stored in session', async () => {
      mockList([apiConsignor, otherApiConsignor])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.consignor) {
          return { operatorId: 'op-c2', name: 'Baltic Livestock Ltd' }
        }
        return null
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/consignors/select',
        auth: sessionAuth('consignor-preselect')
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('input[name="consignor"][value="op-c2"]').attr('checked')).toBe(
        'checked'
      )
      expect(
        $('input[name="consignor"][value="op-c1"]').attr('checked')
      ).toBeUndefined()
    })
  })

  describe('POST /consignors/select', () => {
    test('stores the complete embedded copy (operatorId + every review/outbox field) and redirects to /addresses', async () => {
      mockList([apiConsignor, otherApiConsignor])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.referenceNumber) return 'CON.GB.2026.TEST'
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/consignors/select',
        auth: sessionAuth('consignor-post'),
        payload: { consignor: 'op-c1' }
      })

      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.consignor,
        {
          operatorId: 'op-c1',
          name: 'Tampere Horse Transport',
          address: {
            addressLine1: '12 Dock Road',
            addressLine2: 'Unit 4',
            city: 'Hull',
            county: 'East Yorkshire',
            postcode: 'HU1 1AA',
            country: 'Finland'
          },
          telephone: '01234 567890',
          email: 'ops@tampere.example'
        }
      )
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/addresses')
    })

    test('rejects an id that is not in the fetched list without writing the session', async () => {
      mockList([apiConsignor, otherApiConsignor])

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/consignors/select',
        auth: sessionAuth('consignor-post-invalid'),
        payload: { consignor: 'op-not-mine' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toContain('Select a consignor or exporter')
      expect(sessionHelpers.setSessionValue).not.toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.consignor,
        expect.anything()
      )
    })

    test('rejects a missing selection with the same error copy', async () => {
      mockList([apiConsignor, otherApiConsignor])

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/consignors/select',
        auth: sessionAuth('consignor-post-empty'),
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toContain('Select a consignor or exporter')
    })
  })
})
