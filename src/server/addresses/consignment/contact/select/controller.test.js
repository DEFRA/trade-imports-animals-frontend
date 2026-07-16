import { load } from 'cheerio'
import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'

import { createServer } from '../../../../server.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../../../../common/constants/messages.js'
import { operatorsClient } from '../../../../common/clients/operators-client.js'
import { mockOidcConfig } from '../../../../common/test-helpers/mock-oidc-config.js'
import * as sessionHelpers from '../../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../../common/constants/session-keys.js'
import { saveNotification } from '../../../../common/helpers/notification-helpers.js'

vi.mock('../../../../common/clients/operators-client.js')

vi.mock('../../../../common/helpers/notification-helpers.js')

vi.mock('../../../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../../../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../../../../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

vi.mock(
  '../../../../common/helpers/session-helpers.js',
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

const apiBranch = {
  id: 'op-b1',
  operator_type: 'BRANCH_ADDRESS',
  name: 'Animal and Plant Health Agency',
  address_line_1: 'Block C',
  address_line_2: 'Government Buildings',
  town: 'Weybridge',
  county: 'Surrey',
  postcode: 'KT15 3NB',
  country: 'United Kingdom',
  telephone: '03000 200301',
  email: 'contact@apha.example'
}

const otherApiBranch = {
  id: 'op-b2',
  operator_type: 'BRANCH_ADDRESS',
  name: 'Border Control Post Dover',
  address_line_1: 'Eastern Docks',
  town: 'Dover',
  postcode: 'CT16 1JA',
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

describe('#consignmentContactSelectController', () => {
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
    saveNotification.mockReset()
  })

  describe('GET /consignment/contact/select', () => {
    test('lists only BRANCH_ADDRESS operators with the operator id as the radio value', async () => {
      mockList([apiBranch, otherApiBranch])

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/consignment/contact/select',
        auth: sessionAuth('contact-get')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(operatorsClient.listOperators).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        { operatorType: 'BRANCH_ADDRESS' }
      )

      const $ = load(result)
      const values = $('input[name="contactAddress"]')
        .map((_, el) => $(el).attr('value'))
        .get()
      expect(values).toEqual(['op-b1', 'op-b2'])
      expect(result).toContain('Animal and Plant Health Agency')
      expect(result).toContain('Border Control Post Dover')
    })

    test('pre-selects the radio whose id matches the operatorId stored in session', async () => {
      mockList([apiBranch, otherApiBranch])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.consignmentContactAddress) {
          return { operatorId: 'op-b2', name: 'Border Control Post Dover' }
        }
        return null
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/consignment/contact/select',
        auth: sessionAuth('contact-preselect')
      })

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)
      expect(
        $('input[name="contactAddress"][value="op-b2"]').attr('checked')
      ).toBe('checked')
    })
  })

  describe('POST /consignment/contact/select', () => {
    beforeEach(() => {
      saveNotification.mockResolvedValue({})
    })

    test('stores the complete embedded copy, saves the notification and redirects to the review page', async () => {
      mockList([apiBranch, otherApiBranch])
      sessionHelpers.getSessionValue.mockImplementation((_request, key) => {
        if (key === sessionKeys.referenceNumber) return 'IMP.GB.2026.TEST'
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/consignment/contact/select',
        auth: sessionAuth('contact-post'),
        payload: { contactAddress: 'op-b1' }
      })

      expect(sessionHelpers.setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.consignmentContactAddress,
        {
          operatorId: 'op-b1',
          name: 'Animal and Plant Health Agency',
          address: {
            addressLine1: 'Block C',
            addressLine2: 'Government Buildings',
            city: 'Weybridge',
            county: 'Surrey',
            postcode: 'KT15 3NB',
            country: 'United Kingdom'
          },
          telephone: '03000 200301',
          email: 'contact@apha.example'
        }
      )
      expect(saveNotification).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/notification-view/IMP.GB.2026.TEST')
    })

    test('renders the page with an error when the notification save fails', async () => {
      mockList([apiBranch, otherApiBranch])
      saveNotification.mockRejectedValueOnce(new Error('Backend error'))

      const { statusCode, result, headers } = await server.inject({
        method: 'POST',
        url: '/consignment/contact/select',
        auth: sessionAuth('contact-post-fail'),
        payload: { contactAddress: 'op-b1' }
      })

      expect(saveNotification).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(headers.location).toBeUndefined()
      expect(result).toContain(SUBMISSION_FAILURE_MESSAGE)
    })

    test('rejects an id that is not in the fetched list without saving', async () => {
      mockList([apiBranch, otherApiBranch])

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/consignment/contact/select',
        auth: sessionAuth('contact-post-invalid'),
        payload: { contactAddress: 'op-not-mine' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toContain('Select a contact address')
      expect(saveNotification).not.toHaveBeenCalled()
      expect(sessionHelpers.setSessionValue).not.toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.consignmentContactAddress,
        expect.anything()
      )
    })
  })
})
