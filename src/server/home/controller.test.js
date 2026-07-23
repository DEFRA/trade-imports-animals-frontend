import { vi } from 'vitest'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { startJourneyController } from './controller.js'

import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { config } from '../../config/config.js'

import { notificationClient } from '../common/clients/notification-client.js'
import { countriesClient } from '../common/clients/countries-client.js'

vi.mock('../common/clients/notification-client.js')
vi.mock('../common/clients/countries-client.js')

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

function sessionAuth(sessionId) {
  return {
    strategy: 'session',
    credentials: { user: {}, sessionId }
  }
}

const mockFindAllApiResponse = {
  content: [
    {
      referenceNumber: 'REF-123',
      status: 'DRAFT',
      createdAt: '2026-04-20T10:00:00.000Z',
      origin: { countryCode: 'FI', countryName: 'Finland' },
      commodity: { name: 'Cow', code: '0102' },
      consignor: { name: 'Tampere Horse Transport' },
      transport: { arrivalDate: '2026-04-20' }
    }
  ],
  page: 1,
  size: 20,
  totalElements: 1,
  totalPages: 1
}

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    countriesClient.getCountries.mockResolvedValue([])
  })

  describe('GET /', () => {
    beforeEach(() => {
      notificationClient.findAll.mockClear()
      notificationClient.findAll.mockResolvedValue({
        content: [],
        page: 1,
        size: 20,
        totalElements: 0,
        totalPages: 1
      })
    })

    test('Should call findAll and show zero results when no notifications', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-empty-list')
      })

      expect(notificationClient.findAll).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('No Results'))
      expect(result).not.toEqual(expect.stringContaining('govuk-summary-card'))
    })

    test('Should render notification list when findAll returns notifications', async () => {
      notificationClient.findAll.mockResolvedValueOnce(mockFindAllApiResponse)
      countriesClient.getCountries.mockResolvedValueOnce([
        { code: 'FI', name: 'Finland' }
      ])

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-with-notifications')
      })

      expect(notificationClient.findAll).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Showing 1 Results'))
      expect(result).toEqual(expect.stringContaining('REF-123'))
      expect(result).toEqual(expect.stringContaining('Cow'))
      expect(result).toEqual(expect.stringContaining('Finland'))
      expect(result).toEqual(expect.stringContaining('20 Apr 2026'))
      expect(result).toEqual(expect.stringContaining('Tampere Horse Transport'))
      expect(result).toEqual(expect.stringContaining('govuk-tag--grey'))
      expect(result).toEqual(expect.stringContaining('Draft'))
    })

    test('Should show country code when countries client fails', async () => {
      notificationClient.findAll.mockResolvedValueOnce(mockFindAllApiResponse)
      countriesClient.getCountries.mockRejectedValueOnce(
        new Error('Reference data unavailable')
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-countries-fail')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('REF-123'))
      expect(result).toEqual(expect.stringContaining('FI'))
    })

    test('Should render SUBMITTED notifications with a green status tag', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: [
          {
            ...mockFindAllApiResponse.content[0],
            referenceNumber: 'REF-456',
            status: 'SUBMITTED'
          }
        ],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-submitted-notification')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('REF-456'))
      expect(result).toEqual(expect.stringContaining('govuk-tag--blue'))
      expect(result).toEqual(expect.stringContaining('Submitted'))
    })

    test('Should render a View link pointing to the notification-view page for each notification', async () => {
      notificationClient.findAll.mockResolvedValueOnce(mockFindAllApiResponse)

      const { result } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-view-link')
      })

      expect(result).toEqual(
        expect.stringContaining('href="/notification-view/REF-123"')
      )
      expect(result).toEqual(expect.stringContaining('View'))
    })

    test('Should render Copy as new action for DRAFT notifications', async () => {
      notificationClient.findAll.mockResolvedValueOnce(mockFindAllApiResponse)

      const { result } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-copy-draft')
      })

      expect(result).toEqual(
        expect.stringContaining('action="/notification-copy/REF-123"')
      )
      expect(result).toEqual(expect.stringContaining('Copy as new'))
    })

    test('Should render Copy as new action for SUBMITTED notifications', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: [
          {
            ...mockFindAllApiResponse.content[0],
            referenceNumber: 'REF-789',
            status: 'SUBMITTED'
          }
        ],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-copy-submitted')
      })

      expect(result).toEqual(
        expect.stringContaining('action="/notification-copy/REF-789"')
      )
      expect(result).toEqual(expect.stringContaining('Copy as new'))
    })

    test('Should not render Copy as new action for DELETED notifications', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: [
          {
            ...mockFindAllApiResponse.content[0],
            referenceNumber: 'REF-DEL',
            status: 'DELETED'
          }
        ],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-no-copy-deleted')
      })

      expect(result).not.toEqual(
        expect.stringContaining('action="/notification-copy/REF-DEL"')
      )
      expect(result).not.toEqual(expect.stringContaining('Copy as new'))
    })

    test('Should render Amend action for SUBMITTED notifications', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: [
          {
            ...mockFindAllApiResponse.content[0],
            referenceNumber: 'REF-AMD',
            status: 'SUBMITTED'
          }
        ],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-amend-submitted')
      })

      expect(result).toEqual(
        expect.stringContaining('action="/notification-amend/REF-AMD"')
      )
      expect(result).toEqual(
        expect.stringContaining('Amend<span class="govuk-visually-hidden">')
      )
    })

    test('Should not render Amend action for DRAFT notifications', async () => {
      notificationClient.findAll.mockResolvedValueOnce(mockFindAllApiResponse)

      const { result } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-no-amend-draft')
      })

      expect(result).not.toEqual(
        expect.stringContaining('action="/notification-amend/REF-123"')
      )
    })

    test('Should not render Amend action for AMEND notifications', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: [
          {
            ...mockFindAllApiResponse.content[0],
            referenceNumber: 'REF-AMENDED',
            status: 'AMEND'
          }
        ],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-no-amend-amend')
      })

      expect(result).not.toEqual(
        expect.stringContaining('action="/notification-amend/REF-AMENDED"')
      )
    })

    test('Should render AMEND notifications with a yellow status tag', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: [
          {
            ...mockFindAllApiResponse.content[0],
            referenceNumber: 'REF-AMENDED-TAG',
            status: 'AMEND'
          }
        ],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-amend-tag')
      })

      expect(result).toEqual(expect.stringContaining('govuk-tag--yellow'))
      expect(result).toEqual(expect.stringContaining('Amend'))
    })

    test('Should return 500 when findAll fails', async () => {
      notificationClient.findAll.mockRejectedValueOnce(
        new Error('Backend error')
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-find-all-failure')
      })

      expect(notificationClient.findAll).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toEqual(
        expect.stringContaining('Import notification service')
      )
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining(
          'Something went wrong, please contact the EUDP team'
        )
      )
    })

    test('Should display totalElements as the results count', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: Array.from({ length: 20 }, (_, i) => ({
          ...mockFindAllApiResponse.content[0],
          referenceNumber: `REF-${i}`
        })),
        page: 1,
        size: 20,
        totalElements: 57,
        totalPages: 3
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-total-elements')
      })

      expect(result).toEqual(
        expect.stringContaining('Showing 1 to 20 of 57 Results')
      )
    })

    test('Should render custom pagination when totalPages > 1', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: mockFindAllApiResponse.content,
        page: 1,
        size: 20,
        totalElements: 42,
        totalPages: 3
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-pagination')
      })

      expect(result).toEqual(
        expect.stringContaining('notifications-pagination')
      )
      expect(result).toEqual(expect.stringContaining('Next page'))
      expect(result).toEqual(expect.stringContaining('2 of 3'))
    })

    test('Should not render pagination when totalPages is 1', async () => {
      notificationClient.findAll.mockResolvedValueOnce(mockFindAllApiResponse)

      const { result } = await server.inject({
        method: 'GET',
        url: '/',
        auth: sessionAuth('home-get-no-pagination')
      })

      expect(result).not.toEqual(
        expect.stringContaining('notifications-pagination')
      )
    })

    test('Should pass page query param to findAll', async () => {
      await server.inject({
        method: 'GET',
        url: '/?page=2',
        auth: sessionAuth('home-get-page-param')
      })

      expect(notificationClient.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        { page: 2, sort: 'arrivalDate,desc' }
      )
    })

    test('Should render sort by select and pass sort query to findAll', async () => {
      notificationClient.findAll.mockResolvedValueOnce(mockFindAllApiResponse)

      const { result } = await server.inject({
        method: 'GET',
        url: '/?sort=createdAt,asc',
        auth: sessionAuth('home-get-sort')
      })

      expect(result).toEqual(expect.stringContaining('Sort by'))
      expect(result).toEqual(expect.stringContaining('name="sort"'))
      expect(result).toEqual(expect.stringContaining('Update sort'))
      expect(notificationClient.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        { page: 1, sort: 'createdAt,asc' }
      )
    })

    test('Should preserve current page when sort changes on a paginated view', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: mockFindAllApiResponse.content,
        page: 2,
        size: 20,
        totalElements: 42,
        totalPages: 3
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/?page=2&sort=createdAt,asc',
        auth: sessionAuth('home-get-sort-page-2')
      })

      expect(notificationClient.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        { page: 2, sort: 'createdAt,asc' }
      )
      expect(result).toEqual(expect.stringContaining('name="page"'))
      expect(result).toEqual(expect.stringContaining('value="2"'))
    })

    test('Should render search form and pass referenceNumber to findAll', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: [
          {
            ...mockFindAllApiResponse.content[0],
            referenceNumber: 'GBN-AG-26-ABC123'
          }
        ],
        page: 1,
        size: 20,
        totalElements: 1,
        totalPages: 1
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/?referenceNumber=GBN-AG-26-ABC123',
        auth: sessionAuth('home-get-search-match')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('data-testid="notification-search-form"')
      )
      expect(result).toEqual(expect.stringContaining('Filter notifications'))
      expect(result).toEqual(expect.stringContaining('Keyword or reference'))
      expect(result).toEqual(expect.stringContaining('GBN-AG-26-ABC123'))
      expect(notificationClient.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        {
          page: 1,
          sort: 'arrivalDate,desc',
          referenceNumber: 'GBN-AG-26-ABC123'
        }
      )
    })

    test('Should show No notifications found when search has no matches', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/?referenceNumber=GBN-AG-26-ZZZZZZ',
        auth: sessionAuth('home-get-search-empty')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('No notifications found'))
      expect(result).not.toEqual(expect.stringContaining('govuk-summary-card'))
      expect(notificationClient.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        {
          page: 1,
          sort: 'arrivalDate,desc',
          referenceNumber: 'GBN-AG-26-ZZZZZZ'
        }
      )
    })

    test('Should trim referenceNumber before calling findAll', async () => {
      await server.inject({
        method: 'GET',
        url: '/?referenceNumber=%20GBN-AG-26-ABC123%20',
        auth: sessionAuth('home-get-search-trim')
      })

      expect(notificationClient.findAll).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(String),
        {
          page: 1,
          sort: 'arrivalDate,desc',
          referenceNumber: 'GBN-AG-26-ABC123'
        }
      )
    })

    test('Should show No notifications found when search text is free text', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: [],
        page: 1,
        size: 20,
        totalElements: 0,
        totalPages: 0
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/?referenceNumber=invalid-ref',
        auth: sessionAuth('home-get-search-free-text')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('No notifications found'))
      expect(result).not.toEqual(expect.stringContaining('There is a problem'))
      expect(result).not.toEqual(expect.stringContaining('govuk-summary-card'))
    })

    test('Should show No notifications found when backend rejects search with bad request', async () => {
      const error = new Error('Failed to get notifications')
      error.status = 400
      error.statusText = 'Bad Request'
      notificationClient.findAll.mockRejectedValueOnce(error)

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/?referenceNumber=invalid-ref',
        auth: sessionAuth('home-get-search-bad-request')
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('No notifications found'))
      expect(result).not.toEqual(expect.stringContaining('There is a problem'))
    })

    test('Should use backend-clamped page for view links when query page is too large', async () => {
      notificationClient.findAll.mockResolvedValueOnce({
        content: mockFindAllApiResponse.content,
        page: 3,
        size: 20,
        totalElements: 42,
        totalPages: 3
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/?page=999',
        auth: sessionAuth('home-get-large-page')
      })

      expect(result).toEqual(
        expect.stringContaining('href="/notification-view/REF-123?page=3"')
      )
      expect(result).toEqual(expect.stringContaining('Previous page'))
      expect(result).not.toEqual(expect.stringContaining('Next page'))
    })
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('home-get-default')
    })

    expect(result).toEqual(
      expect.stringContaining('Import notification service |')
    )
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should display title "Import notification service"', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('home-get-title')
    })

    expect(result).toEqual(
      expect.stringContaining('Import notification service')
    )
  })

  test('Should display button to create import notification', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('home-get-create-button')
    })

    expect(result).toEqual(
      expect.stringContaining('Create an import notification')
    )
    expect(result).toEqual(expect.stringContaining('action="/start-journey"'))
  })

  test('Should not render sign-in/sign-out links when authEnabled is false', async () => {
    const originalGet = config.get.bind(config)
    const getSpy = vi
      .spyOn(config, 'get')
      .mockImplementation((key) =>
        key === 'auth.enabled' ? false : originalGet(key)
      )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/',
      auth: sessionAuth('home-get-auth-disabled')
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).not.toContain('Sign in')
    expect(result).not.toContain('Sign out')
    expect(result).not.toContain('/auth/sign-in-oidc')
    expect(result).not.toContain('/signout')

    getSpy.mockRestore()
  })

  describe('POST /start-journey', () => {
    test('Should redirect to origin page', async () => {
      const request = {
        yar: {
          reset: vi.fn()
        }
      }

      const h = {
        redirect: (location) => ({
          statusCode: 302,
          location
        })
      }

      const response = await startJourneyController.handler(request, h)

      expect(request.yar.reset).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toBe(302)
      expect(response.location).toBe('/origin')
    })

    test('Should clear session when starting new journey', async () => {
      const request = {
        yar: {
          reset: vi.fn()
        }
      }

      const h = {
        redirect: (location) => ({
          statusCode: 302,
          location
        })
      }

      const response = await startJourneyController.handler(request, h)

      expect(request.yar.reset).toHaveBeenCalledTimes(1)
      expect(response.statusCode).toBe(302)
      expect(response.location).toBe('/origin')
    })
  })
})
