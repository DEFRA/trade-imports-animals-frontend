import { describe, expect, test, vi } from 'vitest'
import { portOfEntryController } from './controller.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn(() => 'trace-abc')
}))

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

const validPayload = {
  portOfEntry: 'ABERDEEN',
  'arrivalDate-day': 27,
  'arrivalDate-month': 3,
  'arrivalDate-year': 2026
}

const buildRequest = ({ payload, sessionValues = {} } = {}) => {
  const set = vi.fn()
  const get = vi.fn((key) => sessionValues[key] ?? null)
  return {
    request: { payload, yar: { set, get } },
    set
  }
}

const buildResponseToolkit = () => {
  // function-keyword (not arrow) so `this` binds to the view return object,
  // preserving template/data when chained as h.view(...).code(...)
  const code = vi.fn(function (statusCode) {
    return { ...this, statusCode }
  })
  return {
    view: vi.fn((template, data) => ({ template, data, code })),
    redirect: vi.fn((location) => ({
      statusCode: statusCodes.redirectFound,
      location
    })),
    code
  }
}

describe('portOfEntryController', () => {
  describe('GET /port-of-entry', () => {
    test('renders view with portOfEntry, arrivalDate and referenceNumber from session', () => {
      const { request } = buildRequest({
        sessionValues: {
          portOfEntry: 'ABERDEEN',
          arrivalDate: { day: 27, month: 3, year: 2026 },
          referenceNumber: 'REF-123'
        }
      })
      const h = buildResponseToolkit()

      const response = portOfEntryController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('port-of-entry/index', {
        pageTitle: 'Entry point and arrival at destination',
        portOfEntry: 'ABERDEEN',
        arrivalDate: { day: 27, month: 3, year: 2026 },
        referenceNumber: 'REF-123'
      })
      expect(response.template).toBe('port-of-entry/index')
    })

    test('renders view with null values when session is empty', () => {
      const { request } = buildRequest()
      const h = buildResponseToolkit()

      portOfEntryController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('port-of-entry/index', {
        pageTitle: 'Entry point and arrival at destination',
        portOfEntry: null,
        arrivalDate: null,
        referenceNumber: null
      })
    })
  })

  describe('POST /port-of-entry', () => {
    test('saves portOfEntry and arrivalDate to session, submits notification, and redirects', async () => {
      vi.spyOn(notificationClient, 'submit').mockResolvedValue({})

      const { request, set } = buildRequest({ payload: validPayload })
      const h = buildResponseToolkit()

      const response = await portOfEntryController.post.handler(request, h)

      expect(set).toHaveBeenCalledWith('portOfEntry', 'ABERDEEN')
      expect(set).toHaveBeenCalledWith('arrivalDate', {
        day: 27,
        month: 3,
        year: 2026
      })
      expect(notificationClient.submit).toHaveBeenCalledWith(
        request,
        'trace-abc'
      )
      expect(response).toEqual({
        statusCode: statusCodes.redirectFound,
        location: '/port-of-entry'
      })
    })

    test('returns 400 with error list when arrival day is out of range', async () => {
      const { request, set } = buildRequest({
        payload: { ...validPayload, 'arrivalDate-day': 32 }
      })
      const h = buildResponseToolkit()

      const response = await portOfEntryController.post.handler(request, h)

      expect(set).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        'port-of-entry/index',
        expect.objectContaining({
          errorList: expect.arrayContaining([
            expect.objectContaining({ text: 'Enter a valid day' })
          ])
        })
      )
      expect(response.statusCode).toBe(statusCodes.badRequest)
    })

    test('shows error when notification client throws', async () => {
      vi.spyOn(notificationClient, 'submit').mockRejectedValue(
        new Error('Backend error')
      )

      const { request, set } = buildRequest({ payload: validPayload })
      const h = buildResponseToolkit()

      await portOfEntryController.post.handler(request, h)

      expect(set).toHaveBeenCalledWith('portOfEntry', 'ABERDEEN')
      expect(set).toHaveBeenCalledWith('arrivalDate', {
        day: 27,
        month: 3,
        year: 2026
      })
      expect(h.view).toHaveBeenCalledWith(
        'port-of-entry/index',
        expect.objectContaining({
          errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
        })
      )
      expect(h.code).toHaveBeenCalledWith(statusCodes.internalServerError)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
