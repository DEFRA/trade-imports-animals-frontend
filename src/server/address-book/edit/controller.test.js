import { describe, expect, test, vi, beforeEach } from 'vitest'
import { editOperatorController } from './controller.js'
import { operatorsClient } from '../../common/clients/operators-client.js'
import { countriesClient } from '../../common/clients/countries-client.js'
import { sessionKeys } from '../../common/constants/session-keys.js'

vi.mock('../../common/clients/operators-client.js')

vi.mock('../../common/clients/countries-client.js', () => ({
  countriesClient: { getCountries: vi.fn() }
}))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn().mockReturnValue('test-trace-id')
}))

const countries = [
  { code: 'FI', name: 'Finland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

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

function editRequest({
  operatorId = 'op-1',
  payload = {},
  yar = fakeYar()
} = {}) {
  return {
    params: { operatorId },
    payload,
    yar,
    auth: {
      credentials: { crn: 'CRN123', organisationId: 'ORG1' }
    }
  }
}

const apiConsignor = {
  id: 'op-1',
  operator_type: 'CONSIGNOR',
  name: 'Tampere Horse Transport',
  address_line_1: '12 Dock Road',
  address_line_2: 'Unit 4',
  town: 'Hull',
  county: 'East Riding',
  postcode: 'HU1 1AA',
  country: 'Finland',
  telephone: '01234 567890',
  email: 'ops@tampere.example'
}

const apiTransporter = {
  id: 'op-2',
  operator_type: 'TRANSPORTER',
  name: 'Nordic Livestock Movers',
  address_line_1: '5 Harbour View',
  town: 'Grimsby',
  postcode: 'DN31 1AA',
  country: 'Finland',
  telephone: '01111 222333',
  email: 'ops@nordic.example',
  approval_number: 'AP-2024-001',
  transporter_category: 'COMMERCIAL'
}

const validPayload = {
  operatorType: 'CONSIGNOR',
  name: 'Tampere Horse Transport',
  addressLine1: '12 Dock Road',
  addressLine2: 'Unit 4',
  city: 'Hull',
  county: 'East Riding',
  postcode: 'HU1 1AA',
  country: 'Finland',
  telephone: '01234 567890',
  email: 'ops@tampere.example'
}

describe('editOperatorController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    countriesClient.getCountries.mockResolvedValue(countries)
  })

  describe('GET /address-book/{operatorId}/edit', () => {
    test('prefills every field from the stored operator and carries the stored type', async () => {
      operatorsClient.getOperator.mockResolvedValue(apiConsignor)
      const h = mockToolkit()

      const response = await editOperatorController.get.handler(
        editRequest({ operatorId: 'op-1' }),
        h
      )

      expect(response.data.operatorType).toBe('CONSIGNOR')
      expect(response.data.isTransporter).toBe(false)
      expect(response.data.formAction).toBe('/address-book/op-1/edit')
      expect(response.data.values).toMatchObject({
        name: 'Tampere Horse Transport',
        addressLine1: '12 Dock Road',
        addressLine2: 'Unit 4',
        city: 'Hull',
        county: 'East Riding',
        postcode: 'HU1 1AA',
        country: 'Finland',
        telephone: '01234 567890',
        email: 'ops@tampere.example'
      })
    })

    test('prefills the conditional transporter fields when the stored type is TRANSPORTER (c-019)', async () => {
      operatorsClient.getOperator.mockResolvedValue(apiTransporter)
      const h = mockToolkit()

      const response = await editOperatorController.get.handler(
        editRequest({ operatorId: 'op-2' }),
        h
      )

      expect(response.data.isTransporter).toBe(true)
      expect(response.data.values.approvalNumber).toBe('AP-2024-001')
      expect(response.data.values.transporterCategory).toBe('COMMERCIAL')
    })

    test('renders the not-found page for an unknown id (client 404)', async () => {
      const notFound = new Error('Failed to get operator')
      notFound.status = 404
      operatorsClient.getOperator.mockRejectedValue(notFound)
      const h = mockToolkit()

      const response = await editOperatorController.get.handler(
        editRequest({ operatorId: 'missing' }),
        h
      )

      expect(response.template).toBe('error/index')
      expect(response.statusCode).toBe(404)
    })
  })

  describe('POST /address-book/{operatorId}/edit', () => {
    test('lists validation failures, preserves input and does not call updateOperator', async () => {
      const h = mockToolkit()

      const response = await editOperatorController.post.handler(
        editRequest({
          operatorId: 'op-1',
          payload: { ...validPayload, name: '' }
        }),
        h
      )

      expect(response.statusCode).toBe(400)
      const messages = response.data.errorList.map((error) => error.text)
      expect(messages).toContain('Enter a name')
      expect(response.data.values.postcode).toBe('HU1 1AA')
      expect(response.data.formAction).toBe('/address-book/op-1/edit')
      expect(operatorsClient.updateOperator).not.toHaveBeenCalled()
    })

    test('saves the changes, sets the updated banner and redirects to the list on a valid submit', async () => {
      operatorsClient.updateOperator.mockResolvedValue({ id: 'op-1' })
      const yar = fakeYar()
      const h = mockToolkit()

      const response = await editOperatorController.post.handler(
        editRequest({ operatorId: 'op-1', payload: { ...validPayload }, yar }),
        h
      )

      expect(operatorsClient.updateOperator).toHaveBeenCalledWith(
        'test-trace-id',
        { crn: 'CRN123', organisationId: 'ORG1' },
        'op-1',
        expect.objectContaining({
          operatorType: 'CONSIGNOR',
          name: 'Tampere Horse Transport',
          city: 'Hull',
          country: 'Finland'
        })
      )
      expect(yar.store[sessionKeys.addressBookBanner]).toBe(
        'Tampere Horse Transport operator updated'
      )
      expect(response.location).toBe('/address-book')
    })

    test('Cancel returns to the list without saving (b-006)', async () => {
      const h = mockToolkit()

      const response = await editOperatorController.post.handler(
        editRequest({
          operatorId: 'op-1',
          payload: { ...validPayload, action: 'cancel' }
        }),
        h
      )

      expect(operatorsClient.updateOperator).not.toHaveBeenCalled()
      expect(response.location).toBe('/address-book')
    })
  })
})
