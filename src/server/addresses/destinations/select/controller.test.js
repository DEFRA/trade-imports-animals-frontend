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

const apiDestination = {
  id: 'op-d1',
  operator_type: 'PLACE_OF_DESTINATION',
  name: 'Green Pastures Farm',
  address_line_1: 'Long Lane',
  address_line_2: 'Barn 3',
  town: 'Melton Mowbray',
  county: 'Leicestershire',
  postcode: 'LE13 1AA',
  country: 'United Kingdom',
  telephone: '01664 555666',
  email: 'farm@greenpastures.example'
}

const otherApiDestination = {
  id: 'op-d2',
  operator_type: 'PLACE_OF_DESTINATION',
  name: 'Hillside Holdings',
  address_line_1: 'Top Road',
  town: 'Skipton',
  postcode: 'BD23 1AA',
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

describe('#destinationsSelectController', () => {
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

  describe('GET /destinations/select', () => {
    test('lists only PLACE_OF_DESTINATION operators with the operator id as the radio value', async () => {
      mockList([apiDestination, otherApiDestination])

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/destinations/select',
        auth: sessionAuth('destination-get')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(operatorsClient.listOperators).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        { operatorType: 'PLACE_OF_DESTINATION' }
      )

      const $ = load(result)
      const values = $('input[name="destination"]')
        .map((_, el) => $(el).attr('value'))
        .get()
      expect(values).toEqual(['op-d1', 'op-d2'])
      expect(result).toContain('Green Pastures Farm')
      expect(result).toContain('Hillside Holdings')
    })

    test('pre-selects the radio whose id matches the operatorId stored in session', async () => {
      mockList([apiDestination, otherApiDestination])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.destination) {
          return { operatorId: 'op-d2', name: 'Hillside Holdings' }
        }
        return null
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/destinations/select',
        auth: sessionAuth('destination-preselect')
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect(
        $('input[name="destination"][value="op-d2"]').attr('checked')
      ).toBe('checked')
    })
  })

  describe('POST /destinations/select', () => {
    test('stores the complete embedded copy and redirects to /addresses', async () => {
      mockList([apiDestination, otherApiDestination])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.referenceNumber) return 'CON.GB.2026.TEST'
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/destinations/select',
        auth: sessionAuth('destination-post'),
        payload: { destination: 'op-d1' }
      })

      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.destination,
        {
          operatorId: 'op-d1',
          name: 'Green Pastures Farm',
          addressLine1: 'Long Lane',
          addressLine2: 'Barn 3',
          city: 'Melton Mowbray',
          county: 'Leicestershire',
          postcode: 'LE13 1AA',
          country: 'United Kingdom',
          telephone: '01664 555666',
          email: 'farm@greenpastures.example'
        }
      )
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/addresses')
    })

    test('rejects an id that is not in the fetched list without writing the session', async () => {
      mockList([apiDestination, otherApiDestination])

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/destinations/select',
        auth: sessionAuth('destination-post-invalid'),
        payload: { destination: 'op-not-mine' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toContain('Select a place of destination')
      expect(sessionHelpers.setSessionValue).not.toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.destination,
        expect.anything()
      )
    })
  })
})
