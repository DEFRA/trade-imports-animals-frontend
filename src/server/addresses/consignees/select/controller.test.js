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

const apiConsignee = {
  id: 'op-e1',
  operator_type: 'CONSIGNEE',
  name: 'Tech Imports Ltd',
  address_line_1: '643 Main Street',
  address_line_2: 'Suite 2',
  town: 'Dover',
  county: 'Kent',
  postcode: 'CT16 1AA',
  country: 'United Kingdom',
  telephone: '01304 111222',
  email: 'goods@techimports.example'
}

const otherApiConsignee = {
  id: 'op-e2',
  operator_type: 'CONSIGNEE',
  name: 'Coastal Buyers Co',
  address_line_1: '9 Quay Street',
  town: 'Folkestone',
  postcode: 'CT20 1AA',
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

describe('#consigneesSelectController', () => {
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

  describe('GET /consignees/select', () => {
    test('lists only CONSIGNEE operators with the operator id as the radio value', async () => {
      mockList([apiConsignee, otherApiConsignee])

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/consignees/select',
        auth: sessionAuth('consignee-get')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(operatorsClient.listOperators).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        { operatorType: 'CONSIGNEE' }
      )

      const $ = load(result)
      const values = $('input[name="consignee"]')
        .map((_, el) => $(el).attr('value'))
        .get()
      expect(values).toEqual(['op-e1', 'op-e2'])
      expect(result).toContain('Tech Imports Ltd')
      expect(result).toContain('Coastal Buyers Co')
    })

    test('pre-selects the radio whose id matches the operatorId stored in session', async () => {
      mockList([apiConsignee, otherApiConsignee])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.consignee) {
          return { operatorId: 'op-e2', name: 'Coastal Buyers Co' }
        }
        return null
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/consignees/select',
        auth: sessionAuth('consignee-preselect')
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('input[name="consignee"][value="op-e2"]').attr('checked')).toBe(
        'checked'
      )
    })
  })

  describe('POST /consignees/select', () => {
    test('stores the complete embedded copy and redirects to /addresses', async () => {
      mockList([apiConsignee, otherApiConsignee])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.referenceNumber) return 'CON.GB.2026.TEST'
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/consignees/select',
        auth: sessionAuth('consignee-post'),
        payload: { consignee: 'op-e1' }
      })

      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.consignee,
        {
          operatorId: 'op-e1',
          name: 'Tech Imports Ltd',
          addressLine1: '643 Main Street',
          addressLine2: 'Suite 2',
          city: 'Dover',
          county: 'Kent',
          postcode: 'CT16 1AA',
          country: 'United Kingdom',
          telephone: '01304 111222',
          email: 'goods@techimports.example'
        }
      )
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/addresses')
    })

    test('rejects an id that is not in the fetched list without writing the session', async () => {
      mockList([apiConsignee, otherApiConsignee])

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/consignees/select',
        auth: sessionAuth('consignee-post-invalid'),
        payload: { consignee: 'op-not-mine' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toContain('Select a consignee')
      expect(sessionHelpers.setSessionValue).not.toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.consignee,
        expect.anything()
      )
    })
  })
})
