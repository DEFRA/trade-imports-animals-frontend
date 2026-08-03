import Hapi from '@hapi/hapi'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { plantProducts } from '../../../../../../routes-plant-products.js'
import { enterSetContext } from '../../../../../../shared/set-context.js'
import {
  createPath,
  createRoutePath,
  dashboardPath,
  dashboardRoutePath
} from '../../../../../../shared/paths.js'
import { records as plantRecords } from '../../../../services/records/index.js'
import { records as recordsReal } from '../../../../services/records/real.js'
import { records as recordsStub } from '../../../../services/records/stub.js'
import { copy } from './copy/copy.en.js'
import { routes } from './controller.js'

const emptyList = {
  rows: [],
  page: 1,
  size: 25,
  totalElements: 0,
  totalPages: 0
}

const listedRow = (overrides = {}) => ({
  journeyId: 'GBN-PP-26-ABC123',
  status: 'draft',
  originCountryCode: 'IE',
  arrivalDate: '2026-03-07',
  createdAt: '2026-03-01T10:00:00Z',
  submittedAt: null,
  ...overrides
})

const listEnvelope = (rows, overrides = {}) => ({
  rows,
  page: 1,
  size: 25,
  totalElements: rows.length,
  totalPages: rows.length > 0 ? 1 : 0,
  ...overrides
})

describe('plant-products dashboard controller', () => {
  let server

  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    enterSetContext('plant-products')
    server = Hapi.server()
    await server.register(nunjucksConfig)
    await server.register(plantProducts, {
      routes: { prefix: '/plant-products' }
    })
    await server.initialize()
  })

  afterEach(async () => {
    enterSetContext('plant-products')
    configureRecords('plant-products', plantRecords)
    await recordsStub.clear()
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })

  it('registers prefix-free route shapes and renders prefix-bearing actions', async () => {
    enterSetContext('plant-products')
    expect(routes.map(({ path }) => path)).toEqual([
      dashboardRoutePath(),
      createRoutePath()
    ])
    expect(routes.map(({ path }) => path)).toEqual(['/', '/notifications'])
    expect(dashboardPath()).toBe('/plant-products')
    expect(createPath()).toBe('/plant-products/notifications')

    const response = await server.inject('/plant-products')
    expect(response.statusCode).toBe(200)
    expect(response.result).toContain('action="/plant-products"')
    expect(response.result).toContain('action="/plant-products/notifications"')
    expect(response.result).toContain('href="/plant-products"')
  })

  it('renders rows in the records order and asks for newest arrival first', async () => {
    const newest = listedRow({
      journeyId: 'GBN-PP-26-NEWEST',
      arrivalDate: '2026-03-08'
    })
    const older = listedRow({
      journeyId: 'GBN-PP-26-OLDER',
      arrivalDate: '2026-03-07'
    })
    let received
    configureRecords('plant-products', {
      ...recordsStub,
      list: async (options) => {
        received = options
        return listEnvelope([newest, older])
      }
    })

    const response = await server.inject('/plant-products')

    expect(received).toMatchObject({
      page: 1,
      sort: 'arrivalDate,desc',
      referenceNumber: undefined
    })
    expect(response.result.indexOf(newest.journeyId)).toBeLessThan(
      response.result.indexOf(older.journeyId)
    )
    expect(response.result).toContain('Republic of Ireland')
    expect(response.result).toContain('7 March 2026')
  })

  it('defensively removes deleted rows', async () => {
    configureRecords('plant-products', {
      ...recordsStub,
      list: async () =>
        listEnvelope([
          listedRow({ status: 'deleted', journeyId: 'DELETED-ROW' })
        ])
    })

    const response = await server.inject('/plant-products')

    expect(response.result).not.toContain('DELETED-ROW')
    expect(response.result).toContain(copy.search.noResults)
  })

  it('trims reference search for records.list and echoes it into the input', async () => {
    let received
    configureRecords('plant-products', {
      ...recordsStub,
      list: async (options) => {
        received = options
        return listEnvelope([listedRow()])
      }
    })

    const response = await server.inject(
      '/plant-products?referenceNumber=%20%20GBN-PP-26-ABC123%20%20'
    )

    expect(received.referenceNumber).toBe('GBN-PP-26-ABC123')
    expect(response.result).toContain('value="  GBN-PP-26-ABC123  "')
    expect(response.result).toContain(copy.pagination.results.single)
  })

  it('renders the empty list returned by records.list', async () => {
    const response = await server.inject(
      '/plant-products?referenceNumber=GBN-PP-26-MISSING'
    )

    expect(response.result).toContain(copy.pagination.results.none)
    expect(response.result).toContain(copy.search.noResults)
  })

  it('combines status, country and inclusive arrival filters over the listed page only', async () => {
    configureRecords('plant-products', {
      ...recordsStub,
      list: async () =>
        listEnvelope([
          listedRow({ journeyId: 'MATCH' }),
          listedRow({ journeyId: 'WRONG-STATUS', status: 'submitted' }),
          listedRow({ journeyId: 'WRONG-COUNTRY', originCountryCode: 'FR' }),
          listedRow({ journeyId: 'WRONG-DATE', arrivalDate: '2026-03-08' })
        ])
    })

    const response = await server.inject(
      '/plant-products?status=draft&countryOfOrigin=IE&startDate-day=7&startDate-month=3&startDate-year=2026&endDate-day=7&endDate-month=3&endDate-year=2026'
    )

    expect(response.result).toContain('MATCH')
    expect(response.result).not.toContain('WRONG-STATUS')
    expect(response.result).not.toContain('WRONG-COUNTRY')
    expect(response.result).not.toContain('WRONG-DATE')
  })

  it('pins the current-page-only filter limitation while preserving filters in pagination', async () => {
    configureRecords('plant-products', {
      ...recordsStub,
      list: async () =>
        listEnvelope([listedRow()], {
          page: 1,
          totalElements: 26,
          totalPages: 2
        })
    })

    const response = await server.inject(
      '/plant-products?sort=createdAt%2Casc&status=draft&countryOfOrigin=IE'
    )

    expect(response.result).toContain(
      'href="/plant-products?page=2&amp;sort=createdAt%2Casc&amp;status=draft&amp;countryOfOrigin=IE"'
    )
    expect(response.result).toContain('Showing 1 to 1 of 26 results')
  })

  it.each([
    [
      'long keywords',
      `referenceNumber=${'x'.repeat(256)}`,
      copy.errors.keywordsMax,
      'referenceNumber',
      'x'.repeat(256)
    ],
    [
      'impossible start date',
      'startDate-day=31&startDate-month=2&startDate-year=2026',
      copy.errors.startDateReal,
      'startDate-day',
      '31'
    ],
    [
      'start after end',
      'startDate-day=9&startDate-month=3&startDate-year=2026&endDate-day=8&endDate-month=3&endDate-year=2026',
      copy.errors.startBeforeEnd,
      'startDate-day',
      '9'
    ]
  ])(
    'returns 400 for %s with linked canonical copy and raw input',
    async (_name, query, message, field, raw) => {
      const response = await server.inject(`/plant-products?${query}`)

      expect(response.statusCode).toBe(400)
      expect(response.result).toContain('There is a problem')
      expect(response.result).toContain(message)
      expect(response.result).toContain(`href="#${field}"`)
      expect(response.result).toContain(`value="${raw}"`)
    }
  )

  it('creates a journey and redirects to its plant import-type page', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/plant-products/notifications'
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toMatch(
      /^\/plant-products\/notifications\/GBN-PP-[^/]+\/import-type$/
    )
  })

  it('re-renders the dashboard at 500 for a recoverable create failure', async () => {
    configureRecords('plant-products', {
      ...recordsStub,
      list: async () => emptyList,
      create: recordsReal.create
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unavailable', {
        status: 500,
        statusText: 'Internal Server Error'
      })
    )

    const response = await server.inject({
      method: 'POST',
      url: '/plant-products/notifications'
    })

    expect(response.statusCode).toBe(500)
    expect(response.result).toContain(copy.heading)
    expect(response.result).toContain(
      'Sorry, there is a problem with the service.'
    )
  })

  it('does not swallow an unexpected create error', async () => {
    configureRecords('plant-products', {
      ...recordsStub,
      create: async () => {
        throw new TypeError('programming failure')
      }
    })

    await expect(routes[1].handler({ query: {}, app: {} }, {})).rejects.toThrow(
      'programming failure'
    )
  })

  it('surfaces records list and create failures', async () => {
    configureRecords('plant-products', {
      ...recordsStub,
      list: async () => {
        throw new Error('list failed')
      },
      create: async () => {
        throw new Error('create failed')
      }
    })

    const listResponse = await server.inject('/plant-products')
    const createResponse = await server.inject({
      method: 'POST',
      url: '/plant-products/notifications'
    })

    expect(listResponse.statusCode).toBe(500)
    expect(createResponse.statusCode).toBe(500)
  })
})
