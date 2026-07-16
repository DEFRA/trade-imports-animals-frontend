import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  test,
  vi
} from 'vitest'
import { load } from 'cheerio'
import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { operatorsClient } from '../../common/clients/operators-client.js'
import { countriesClient } from '../../common/clients/countries-client.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'

vi.mock('../../common/clients/operators-client.js')

vi.mock('../../common/clients/countries-client.js', () => ({
  countriesClient: { getCountries: vi.fn() }
}))

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const countries = [
  { code: 'FI', name: 'Finland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }
]

function sessionAuth(sessionId) {
  return {
    strategy: 'session',
    credentials: { user: {}, sessionId }
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

const apiTransporter = {
  ...apiConsignor,
  id: 'op-2',
  operator_type: 'TRANSPORTER',
  name: 'Nordic Livestock Movers',
  approval_number: 'AP-2024-001',
  transporter_category: 'COMMERCIAL'
}

describe('Edit-an-operator page (rendered DOM)', () => {
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
    operatorsClient.getOperator.mockReset()
    countriesClient.getCountries.mockReset()
    countriesClient.getCountries.mockResolvedValue(countries)
  })

  test('carries operator_type as a hidden input only, never an editable control, and prefills the name', async () => {
    operatorsClient.getOperator.mockResolvedValue(apiConsignor)

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/address-book/op-1/edit',
      auth: sessionAuth('edit-hidden-type')
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)

    const hidden = $('input[type="hidden"][name="operatorType"]')
    expect(hidden.attr('value')).toBe('CONSIGNOR')
    expect($('select[name="operatorType"]').length).toBe(0)
    expect($('input[type="radio"][name="operatorType"]').length).toBe(0)
    expect($('#name').attr('value')).toBe('Tampere Horse Transport')
    expect($('form').attr('action')).toBe('/address-book/op-1/edit')
  })

  test('renders the two conditional fields prefilled for a TRANSPORTER (c-019)', async () => {
    operatorsClient.getOperator.mockResolvedValue(apiTransporter)

    const { result } = await server.inject({
      method: 'GET',
      url: '/address-book/op-2/edit',
      auth: sessionAuth('edit-transporter')
    })

    const $ = load(result)
    expect($('#approvalNumber').attr('value')).toBe('AP-2024-001')
    const checked = $('input[name="transporterCategory"]:checked').attr('value')
    expect(checked).toBe('COMMERCIAL')
  })

  test('renders neither conditional field for a CONSIGNOR (c-019)', async () => {
    operatorsClient.getOperator.mockResolvedValue(apiConsignor)

    const { result } = await server.inject({
      method: 'GET',
      url: '/address-book/op-1/edit',
      auth: sessionAuth('edit-consignor')
    })

    const $ = load(result)
    expect($('#approvalNumber').length).toBe(0)
    expect($('input[name="transporterCategory"]').length).toBe(0)
  })
})
