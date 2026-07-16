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

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { operatorsClient } from '../common/clients/operators-client.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

vi.mock('../common/clients/operators-client.js')

vi.mock('../common/helpers/notification-helpers.js')

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

function sessionAuth(sessionId) {
  return {
    strategy: 'session',
    credentials: { user: {}, sessionId, crn: 'CRN123', organisationId: 'ORG1' }
  }
}

const apiTransporter = {
  id: 'op-t1',
  operator_type: 'TRANSPORTER',
  name: 'García Livestock Transport SL',
  address_line_1: 'Calle Mayor 1',
  town: 'Madrid',
  postcode: '28001',
  country: 'Spain',
  approval_number: 'ES-T2-45001294',
  transporter_category: 'COMMERCIAL'
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

describe('#transportersController', () => {
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
    operatorsClient.listOperators.mockReset()
    saveNotification.mockReset()
  })

  describe('GET /transporters', () => {
    test('offers the add-a-transporter link when none is selected', async () => {
      mockList([apiTransporter])

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporters',
        auth: sessionAuth('transporter-get-default')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Add a transporter')
      expect(result).not.toContain('García Livestock Transport SL')
    })

    test('stores the selected TRANSPORTER operator by id and renders it with a humanised type', async () => {
      mockList([apiTransporter])

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporters?selectedTransporter=op-t1',
        auth: sessionAuth('transporter-get-selected')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(operatorsClient.listOperators).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        { operatorType: 'TRANSPORTER' }
      )
      expect(result).toContain('García Livestock Transport SL')
      expect(result).toContain('ES-T2-45001294')
      expect(result).toContain('Commercial')
      expect(result).not.toContain('Add a transporter')
    })

    test('ignores an id that is not in the operator list', async () => {
      mockList([apiTransporter])

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/transporters?selectedTransporter=op-unknown',
        auth: sessionAuth('transporter-get-unknown')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Add a transporter')
    })
  })

  describe('POST /transporters', () => {
    beforeEach(() => {
      saveNotification.mockResolvedValue({})
    })

    test('saves the notification then redirects to /consignment/contact/select', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/transporters',
        auth: sessionAuth('transporter-post'),
        payload: {}
      })

      expect(saveNotification).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/consignment/contact/select')
    })

    test('renders the page with an error when the notification save fails', async () => {
      saveNotification.mockRejectedValueOnce(new Error('Backend error'))

      const { statusCode, result, headers } = await server.inject({
        method: 'POST',
        url: '/transporters',
        auth: sessionAuth('transporter-post-fail'),
        payload: {}
      })

      expect(saveNotification).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(headers.location).toBeUndefined()
      expect(result).toContain(SUBMISSION_FAILURE_MESSAGE)
    })
  })
})
