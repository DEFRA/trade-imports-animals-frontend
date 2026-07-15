import { describe, expect, test, vi, beforeEach } from 'vitest'
import { addOperatorDetailsController } from './controller.js'
import { operatorsClient } from '../../../common/clients/operators-client.js'
import { countriesClient } from '../../../common/clients/countries-client.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'

vi.mock('../../../common/clients/operators-client.js')

vi.mock('../../../common/clients/countries-client.js', () => ({
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

function detailsRequest({ query = {}, payload = {}, yar = fakeYar() } = {}) {
  return {
    query,
    payload,
    yar,
    auth: {
      credentials: { profile: { crn: 'CRN123', organisationId: 'ORG1' } }
    }
  }
}

const validPayload = {
  operatorType: 'CONSIGNOR',
  name: 'Tampere Horse Transport',
  addressLine1: '12 Dock Road',
  addressLine2: '',
  city: 'Hull',
  county: '',
  postcode: 'HU1 1AA',
  country: 'Finland',
  telephone: '01234 567890',
  email: 'ops@tampere.example'
}

describe('addOperatorDetailsController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    countriesClient.getCountries.mockResolvedValue(countries)
  })

  describe('GET /address-book/add/details', () => {
    test('renders the country select over the full MDM list with display names as the values (c-004)', async () => {
      const h = mockToolkit()
      const response = await addOperatorDetailsController.get.handler(
        detailsRequest({ query: { operator_type: 'CONSIGNOR' } }),
        h
      )

      const countryValues = response.data.countryItems
        .filter((item) => item.value)
        .map((item) => item.value)
      expect(countryValues).toEqual(['Finland', 'United Kingdom', 'France'])
      expect(response.data.countryItems[0]).toEqual({
        value: '',
        text: 'Select a country'
      })
    })

    test('renders the conditional transporter fields when the type is TRANSPORTER (c-019)', async () => {
      const h = mockToolkit()
      const response = await addOperatorDetailsController.get.handler(
        detailsRequest({ query: { operator_type: 'TRANSPORTER' } }),
        h
      )

      expect(response.data.isTransporter).toBe(true)
      expect(response.data.operatorType).toBe('TRANSPORTER')
    })

    test('does NOT render the conditional transporter fields for a CONSIGNOR (c-019)', async () => {
      const h = mockToolkit()
      const response = await addOperatorDetailsController.get.handler(
        detailsRequest({ query: { operator_type: 'CONSIGNOR' } }),
        h
      )

      expect(response.data.isTransporter).toBe(false)
    })

    test('redirects back to the type page when no type is carried', async () => {
      const h = mockToolkit()
      const response = await addOperatorDetailsController.get.handler(
        detailsRequest({ query: {} }),
        h
      )

      expect(h.redirect).toHaveBeenCalledWith('/address-book/add')
      expect(response.location).toBe('/address-book/add')
    })

    test('propagates a countries-client failure to the error page (not an inline error)', async () => {
      countriesClient.getCountries.mockRejectedValue(
        new Error('Failed to get countries')
      )
      const h = mockToolkit()

      await expect(
        addOperatorDetailsController.get.handler(
          detailsRequest({ query: { operator_type: 'CONSIGNOR' } }),
          h
        )
      ).rejects.toThrow('Failed to get countries')
      expect(h.view).not.toHaveBeenCalled()
    })

    test('treats an empty countries list as a failure (throws to the error page)', async () => {
      countriesClient.getCountries.mockResolvedValue([])
      const h = mockToolkit()

      await expect(
        addOperatorDetailsController.get.handler(
          detailsRequest({ query: { operator_type: 'CONSIGNOR' } }),
          h
        )
      ).rejects.toThrow()
      expect(h.view).not.toHaveBeenCalled()
    })
  })

  describe('POST /address-book/add/details', () => {
    test('lists every validation failure and preserves the user input, without creating an operator', async () => {
      const h = mockToolkit()
      const response = await addOperatorDetailsController.post.handler(
        detailsRequest({
          payload: {
            ...validPayload,
            name: '',
            addressLine1: 'x'.repeat(256)
          }
        }),
        h
      )

      expect(response.statusCode).toBe(400)
      const messages = response.data.errorList.map((error) => error.text)
      expect(messages).toContain('Enter a name')
      expect(messages).toContain(
        'Address line 1 must be 255 characters or less'
      )
      expect(response.data.fieldErrors.name).toBeDefined()
      expect(response.data.fieldErrors.addressLine1).toBeDefined()
      expect(response.data.values.postcode).toBe('HU1 1AA')
      expect(response.data.operatorType).toBe('CONSIGNOR')
      expect(operatorsClient.createOperator).not.toHaveBeenCalled()
    })

    test('creates the operator, sets the one-shot success banner and redirects on a valid submit', async () => {
      operatorsClient.createOperator.mockResolvedValue({ id: 'op-9' })
      const yar = fakeYar()
      const h = mockToolkit()
      const response = await addOperatorDetailsController.post.handler(
        detailsRequest({ payload: { ...validPayload }, yar }),
        h
      )

      expect(operatorsClient.createOperator).toHaveBeenCalledWith(
        'test-trace-id',
        { crn: 'CRN123', organisationId: 'ORG1' },
        expect.objectContaining({
          operatorType: 'CONSIGNOR',
          name: 'Tampere Horse Transport',
          city: 'Hull',
          country: 'Finland'
        })
      )
      expect(yar.store[sessionKeys.addressBookBanner]).toBe(
        'Tampere Horse Transport operator added'
      )
      expect(h.redirect).toHaveBeenCalledWith('/address-book')
      expect(response.location).toBe('/address-book')
    })

    test('Cancel returns to the list without writing anything (b-006)', async () => {
      const h = mockToolkit()
      const response = await addOperatorDetailsController.post.handler(
        detailsRequest({ payload: { ...validPayload, action: 'cancel' } }),
        h
      )

      expect(operatorsClient.createOperator).not.toHaveBeenCalled()
      expect(h.redirect).toHaveBeenCalledWith('/address-book')
      expect(response.location).toBe('/address-book')
    })

    test('rejects transporter-only fields posted against a non-transporter type (c-019)', async () => {
      const h = mockToolkit()
      const response = await addOperatorDetailsController.post.handler(
        detailsRequest({
          payload: {
            ...validPayload,
            operatorType: 'CONSIGNOR',
            approvalNumber: 'AP-1'
          }
        }),
        h
      )

      expect(response.statusCode).toBe(400)
      expect(operatorsClient.createOperator).not.toHaveBeenCalled()
    })
  })
})
