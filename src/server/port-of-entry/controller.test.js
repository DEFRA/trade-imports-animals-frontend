import { describe, expect, test, vi } from 'vitest'
import { portOfEntryController } from './controller.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

vi.mock('../common/helpers/notification-helpers.js')

vi.mock('../common/helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('../common/clients/ports-of-entry-client.js', () => ({
  portsOfEntryClient: {
    getPortsOfEntry: vi.fn().mockResolvedValue([
      { code: 'GBABE', name: 'Aberdeen' },
      { code: 'GBEDI', name: 'Edinburgh' }
    ])
  }
}))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn().mockReturnValue('test-trace-id')
}))

const expectedPortItems = [
  { value: '', text: 'Select port of entry' },
  { text: '──────────', disabled: true },
  { value: 'GBABE', text: 'Aberdeen (GBABE)' },
  { value: 'GBEDI', text: 'Edinburgh (GBEDI)' }
]

const validPayload = {
  portOfEntry: 'GBABE',
  'arrivalDate-day': 27,
  'arrivalDate-month': 3,
  'arrivalDate-year': 2026
}

describe('portOfEntryController', () => {
  describe('GET /port-of-entry', () => {
    test('renders view with portOfEntry, arrivalDate, referenceNumber and portItems from session', async () => {
      const get = vi.fn((key) => {
        const values = {
          portOfEntry: 'GBABE',
          arrivalDate: { day: 27, month: 3, year: 2026 },
          referenceNumber: 'REF-123'
        }
        return values[key] ?? null
      })
      const request = { yar: { get } }
      const h = { view: vi.fn((template, data) => ({ template, data })) }

      const response = await portOfEntryController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('port-of-entry/index', {
        pageTitle: 'Entry point and arrival at destination',
        portOfEntry: 'GBABE',
        arrivalDate: { day: 27, month: 3, year: 2026 },
        referenceNumber: 'REF-123',
        portItems: expectedPortItems
      })
      expect(response.template).toBe('port-of-entry/index')
    })

    test('renders view with null values and portItems when session is empty', async () => {
      const get = vi.fn(() => null)
      const request = { yar: { get } }
      const h = { view: vi.fn((template, data) => ({ template, data })) }

      await portOfEntryController.get.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('port-of-entry/index', {
        pageTitle: 'Entry point and arrival at destination',
        portOfEntry: null,
        arrivalDate: null,
        referenceNumber: null,
        portItems: expectedPortItems
      })
    })
  })

  describe('POST /port-of-entry', () => {
    test('saves portOfEntry and arrivalDate to session, submits notification, and redirects', async () => {
      const set = vi.fn()
      const get = vi.fn(() => null)
      const request = {
        payload: validPayload,
        yar: { set, get }
      }
      const h = {
        view: vi.fn(),
        redirect: vi.fn((location) => ({ statusCode: 302, location }))
      }

      const response = await portOfEntryController.post.handler(request, h)

      expect(set).toHaveBeenCalledWith(sessionKeys.portOfEntry, 'GBABE')
      expect(set).toHaveBeenCalledWith(sessionKeys.arrivalDate, {
        day: 27,
        month: 3,
        year: 2026
      })
      expect(saveNotification).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          info: expect.any(Function),
          error: expect.any(Function)
        })
      )
      expect(response).toEqual({ statusCode: 302, location: '/transporters' })
    })

    test('returns 400 with error list and portItems when arrival day is out of range', async () => {
      const set = vi.fn()
      const get = vi.fn(() => null)
      const request = {
        payload: { ...validPayload, 'arrivalDate-day': 32 },
        yar: { set, get }
      }
      const h = {
        view: vi.fn((template, data) => ({
          template,
          data,
          code: vi.fn(function (statusCode) {
            return { ...this, statusCode }
          })
        })),
        redirect: vi.fn()
      }

      const response = await portOfEntryController.post.handler(request, h)

      expect(set).not.toHaveBeenCalled()
      expect(h.view).toHaveBeenCalledWith(
        'port-of-entry/index',
        expect.objectContaining({
          portItems: expectedPortItems,
          errorList: expect.arrayContaining([
            expect.objectContaining({ text: 'Enter a valid day' })
          ])
        })
      )
      expect(response.statusCode).toBe(400)
    })

    test('shows error when notification client throws', async () => {
      saveNotification.mockRejectedValueOnce(new Error('Backend error'))

      const set = vi.fn()
      const get = vi.fn(() => null)
      const request = {
        payload: validPayload,
        yar: { set, get }
      }
      const mockCode = vi.fn(() => ({ statusCode: 500 }))
      const h = {
        view: vi.fn(() => ({ code: mockCode })),
        redirect: vi.fn()
      }

      await portOfEntryController.post.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        'port-of-entry/index',
        expect.objectContaining({
          portItems: expectedPortItems,
          errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
        })
      )
      expect(mockCode).toHaveBeenCalledWith(500)
      expect(h.redirect).not.toHaveBeenCalled()
    })
  })
})
