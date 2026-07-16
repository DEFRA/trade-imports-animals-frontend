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

import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { operatorsClient } from '../../common/clients/operators-client.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'

vi.mock('../../common/clients/operators-client.js')

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../../common/test-helpers/mock-auth-config.js')
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

const otherApiTransporter = {
  id: 'op-t2',
  operator_type: 'TRANSPORTER',
  name: 'John Gosden LTD',
  address_line_1: 'Clarehaven Stables',
  town: 'Newmarket',
  postcode: 'CB8 0RH',
  country: 'United Kingdom',
  approval_number: 'UK/BURY/T2/00104127',
  transporter_category: 'PRIVATE'
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

describe('#transportersSelectController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    if (server) {
      await server.stop({ timeout: 0 })
    }
    vi.restoreAllMocks()
  })

  afterEach(() => {
    operatorsClient.listOperators.mockReset()
  })

  test('lists TRANSPORTER operators with Approval number and Type columns populated', async () => {
    mockList([apiTransporter, otherApiTransporter])

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/transporters/select',
      auth: sessionAuth('transporter-select-get')
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
    expect(result).toContain('UK/BURY/T2/00104127')
    expect(result).toContain('Private')
  })

  test('the Select links carry the operator id, not a list index', async () => {
    mockList([apiTransporter, otherApiTransporter])

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/transporters/select',
      auth: sessionAuth('transporter-select-links')
    })

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    const hrefs = $('a[id^="selectedTransporter-"]')
      .map((_, el) => $(el).attr('href'))
      .get()
    expect(hrefs).toEqual([
      '/transporters?selectedTransporter=op-t1',
      '/transporters?selectedTransporter=op-t2'
    ])
  })

  test('the deleted mock transporter loader and fixture can no longer be imported', async () => {
    await expect(import('../load-mock-transporters.js')).rejects.toThrow()
    await expect(import('./mock-transporters.json')).rejects.toThrow()
  })
})
