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

const apiPlaceOfOrigin = {
  id: 'op-o1',
  operator_type: 'PLACE_OF_ORIGIN',
  name: 'Alpine Rearing Station',
  address_line_1: 'Bergweg 4',
  address_line_2: 'Haus 2',
  town: 'Innsbruck',
  county: 'Tirol',
  postcode: '6020',
  country: 'Austria',
  telephone: '+43 512 000000',
  email: 'origin@alpine.example'
}

const otherApiPlaceOfOrigin = {
  id: 'op-o2',
  operator_type: 'PLACE_OF_ORIGIN',
  name: 'Lowland Breeders',
  address_line_1: 'Polderweg 9',
  town: 'Zwolle',
  postcode: '8011',
  country: 'Netherlands'
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

describe('#placeOfOriginSelectController', () => {
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

  describe('GET /place-of-origin/select', () => {
    test('lists only PLACE_OF_ORIGIN operators with the operator id as the radio value', async () => {
      mockList([apiPlaceOfOrigin, otherApiPlaceOfOrigin])

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/place-of-origin/select',
        auth: sessionAuth('origin-get')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(operatorsClient.listOperators).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        { operatorType: 'PLACE_OF_ORIGIN' }
      )

      const $ = load(result)
      const values = $('input[name="placeOfOrigin"]')
        .map((_, el) => $(el).attr('value'))
        .get()
      expect(values).toEqual(['op-o1', 'op-o2'])
      expect(result).toContain('Alpine Rearing Station')
      expect(result).toContain('Lowland Breeders')
    })

    test('pre-selects the radio whose id matches the operatorId stored in session', async () => {
      mockList([apiPlaceOfOrigin, otherApiPlaceOfOrigin])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.placeOfOrigin) {
          return { operatorId: 'op-o2', name: 'Lowland Breeders' }
        }
        return null
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/place-of-origin/select',
        auth: sessionAuth('origin-preselect')
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect(
        $('input[name="placeOfOrigin"][value="op-o2"]').attr('checked')
      ).toBe('checked')
    })
  })

  describe('POST /place-of-origin/select', () => {
    test('stores the complete embedded copy and redirects to /addresses', async () => {
      mockList([apiPlaceOfOrigin, otherApiPlaceOfOrigin])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.referenceNumber) return 'CON.GB.2026.TEST'
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/place-of-origin/select',
        auth: sessionAuth('origin-post'),
        payload: { placeOfOrigin: 'op-o1' }
      })

      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.placeOfOrigin,
        {
          operatorId: 'op-o1',
          name: 'Alpine Rearing Station',
          address: {
            addressLine1: 'Bergweg 4',
            addressLine2: 'Haus 2',
            city: 'Innsbruck',
            county: 'Tirol',
            postcode: '6020',
            country: 'Austria'
          },
          telephone: '+43 512 000000',
          email: 'origin@alpine.example'
        }
      )
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/addresses')
    })

    test('rejects an id that is not in the fetched list without writing the session', async () => {
      mockList([apiPlaceOfOrigin, otherApiPlaceOfOrigin])

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/place-of-origin/select',
        auth: sessionAuth('origin-post-invalid'),
        payload: { placeOfOrigin: 'op-not-mine' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toContain('Select a place of origin')
      expect(sessionHelpers.setSessionValue).not.toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.placeOfOrigin,
        expect.anything()
      )
    })
  })
})
