import { describe, expect, test, vi, beforeEach } from 'vitest'
import { deleteOperatorController } from './controller.js'
import { operatorsClient } from '../../common/clients/operators-client.js'
import { sessionKeys } from '../../common/constants/session-keys.js'

vi.mock('../../common/clients/operators-client.js')

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn().mockReturnValue('test-trace-id')
}))

function fakeYar(initial = {}) {
  const store = { ...initial }
  return {
    store,
    set: vi.fn((key, value) => {
      store[key] = value
    }),
    get: vi.fn((key, clear) => {
      const value = store[key] ?? null
      if (clear) {
        delete store[key]
      }
      return value
    })
  }
}

function mockToolkit() {
  const response = {
    code(statusCode) {
      this.statusCode = statusCode
      return this
    }
  }
  return {
    view: vi.fn((template, data) =>
      Object.assign({ template, data }, response)
    ),
    redirect: vi.fn((location) => ({ location }))
  }
}

function deleteRequest({
  operatorId = 'op-1',
  payload = {},
  yar = fakeYar()
} = {}) {
  return {
    params: { operatorId },
    payload,
    yar,
    auth: {
      credentials: { profile: { crn: 'CRN123', organisationId: 'ORG1' } }
    }
  }
}

const apiConsignor = {
  id: 'op-1',
  operator_type: 'CONSIGNOR',
  name: 'Tampere Horse Transport',
  address_line_1: '12 Dock Road',
  town: 'Hull',
  postcode: 'HU1 1AA',
  country: 'Finland',
  telephone: '01234 567890',
  email: 'ops@tampere.example'
}

describe('deleteOperatorController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /address-book/{operatorId}/delete', () => {
    test('renders the confirmation page and does NOT delete on GET (c-010)', async () => {
      operatorsClient.getOperator.mockResolvedValue(apiConsignor)
      const h = mockToolkit()

      const response = await deleteOperatorController.get.handler(
        deleteRequest({ operatorId: 'op-1' }),
        h
      )

      expect(response.template).toBe('address-book/delete/index')
      expect(response.data.operatorName).toBe('Tampere Horse Transport')
      expect(response.data.cancelHref).toBe('/address-book/op-1')
      expect(operatorsClient.deleteOperator).not.toHaveBeenCalled()
    })

    test('renders the not-found page for an unknown id (client 404)', async () => {
      const notFound = new Error('Failed to get operator')
      notFound.status = 404
      operatorsClient.getOperator.mockRejectedValue(notFound)
      const h = mockToolkit()

      const response = await deleteOperatorController.get.handler(
        deleteRequest({ operatorId: 'missing' }),
        h
      )

      expect(response.template).toBe('error/index')
      expect(response.statusCode).toBe(404)
    })
  })

  describe('POST /address-book/{operatorId}/delete', () => {
    test('soft-deletes, sets the deleted banner and redirects to the list', async () => {
      const yar = fakeYar()
      const h = mockToolkit()

      const response = await deleteOperatorController.post.handler(
        deleteRequest({
          operatorId: 'op-1',
          payload: { name: 'Tampere Horse Transport' },
          yar
        }),
        h
      )

      expect(operatorsClient.deleteOperator).toHaveBeenCalledWith(
        'test-trace-id',
        { crn: 'CRN123', organisationId: 'ORG1' },
        'op-1'
      )
      expect(yar.store[sessionKeys.addressBookBanner]).toBe(
        'Tampere Horse Transport operator deleted'
      )
      expect(response.location).toBe('/address-book')
    })

    test('Cancel returns to the view page without deleting', async () => {
      const h = mockToolkit()

      const response = await deleteOperatorController.post.handler(
        deleteRequest({
          operatorId: 'op-1',
          payload: { name: 'Tampere Horse Transport', action: 'cancel' }
        }),
        h
      )

      expect(operatorsClient.deleteOperator).not.toHaveBeenCalled()
      expect(response.location).toBe('/address-book/op-1')
    })
  })
})
