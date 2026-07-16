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

const apiImporter = {
  id: 'op-i1',
  operator_type: 'IMPORTER',
  name: 'Continental Importers Ltd',
  address_line_1: '1 Trade Park',
  address_line_2: 'Unit 7',
  town: 'Harwich',
  county: 'Essex',
  postcode: 'CO12 1AA',
  country: 'United Kingdom',
  telephone: '01255 333444',
  email: 'imports@continental.example'
}

const otherApiImporter = {
  id: 'op-i2',
  operator_type: 'IMPORTER',
  name: 'North Sea Trading',
  address_line_1: '4 Dock Approach',
  town: 'Immingham',
  postcode: 'DN40 1AA',
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

describe('#importersSelectController', () => {
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

  describe('GET /importers/select', () => {
    test('lists only IMPORTER operators with the operator id as the radio value', async () => {
      mockList([apiImporter, otherApiImporter])

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/importers/select',
        auth: sessionAuth('importer-get')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(operatorsClient.listOperators).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        { operatorType: 'IMPORTER' }
      )

      const $ = load(result)
      const values = $('input[name="importer"]')
        .map((_, el) => $(el).attr('value'))
        .get()
      expect(values).toEqual(['op-i1', 'op-i2'])
      expect(result).toContain('Continental Importers Ltd')
      expect(result).toContain('North Sea Trading')
    })

    test('pre-selects the radio whose id matches the operatorId stored in session', async () => {
      mockList([apiImporter, otherApiImporter])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.importer) {
          return { operatorId: 'op-i2', name: 'North Sea Trading' }
        }
        return null
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/importers/select',
        auth: sessionAuth('importer-preselect')
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect($('input[name="importer"][value="op-i2"]').attr('checked')).toBe(
        'checked'
      )
    })
  })

  describe('POST /importers/select', () => {
    test('stores the complete embedded copy and redirects to /addresses', async () => {
      mockList([apiImporter, otherApiImporter])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.referenceNumber) return 'CON.GB.2026.TEST'
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/importers/select',
        auth: sessionAuth('importer-post'),
        payload: { importer: 'op-i1' }
      })

      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.importer,
        {
          operatorId: 'op-i1',
          name: 'Continental Importers Ltd',
          address: {
            addressLine1: '1 Trade Park',
            addressLine2: 'Unit 7',
            city: 'Harwich',
            county: 'Essex',
            postcode: 'CO12 1AA',
            country: 'United Kingdom'
          },
          telephone: '01255 333444',
          email: 'imports@continental.example'
        }
      )
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/addresses')
    })

    test('rejects an id that is not in the fetched list without writing the session', async () => {
      mockList([apiImporter, otherApiImporter])

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/importers/select',
        auth: sessionAuth('importer-post-invalid'),
        payload: { importer: 'op-not-mine' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toContain('Select an importer')
      expect(sessionHelpers.setSessionValue).not.toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.importer,
        expect.anything()
      )
    })
  })
})
