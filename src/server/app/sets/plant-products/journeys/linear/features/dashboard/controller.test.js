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
import {
  enterSetContext,
  withSetContext
} from '../../../../../../shared/set-context.js'
import {
  createPath,
  createRoutePath,
  dashboardPath,
  dashboardRoutePath,
  hubPath,
  pageRoutePath
} from '../../../../../../shared/paths.js'
import { records as plantRecords } from '../../../../services/records/index.js'
import { records as recordsReal } from '../../../../services/records/real.js'
import { records as recordsStub } from '../../../../services/records/stub.js'
import { copy } from './copy/copy.en.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { routes } from './controller.js'

const SET_ID = 'plant-products'
const DASHBOARD_URL = '/plant-products'
const CREATE_URL = `${DASHBOARD_URL}/notifications`

let server

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

const setupDashboardServer = () => {
  beforeAll(async () => {
    vi.stubEnv('PLANT_PRODUCTS_MODE', 'stub')
    enterSetContext(SET_ID)
    server = Hapi.server()
    await server.register(nunjucksConfig)
    await server.register(plantProducts, {
      routes: { prefix: DASHBOARD_URL }
    })
    await server.initialize()
  })

  afterEach(async () => {
    enterSetContext(SET_ID)
    configureRecords(SET_ID, plantRecords)
    await recordsStub.clear()
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    vi.unstubAllEnvs()
    await server.stop({ timeout: 0 })
  })
}

const routeAndRenderTests = () => {
  it('registers prefix-free route shapes and renders prefix-bearing actions', async () => {
    enterSetContext(SET_ID)
    expect(routes.map(({ path }) => path)).toEqual([
      dashboardRoutePath(),
      pageRoutePath('amend'),
      createRoutePath()
    ])
    expect(routes.map(({ path }) => path)).toEqual([
      '/',
      '/notifications/{journeyId}/amend',
      '/notifications'
    ])
    expect(dashboardPath()).toBe(DASHBOARD_URL)
    expect(createPath()).toBe(CREATE_URL)

    const response = await server.inject(DASHBOARD_URL)
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
    configureRecords(SET_ID, {
      ...recordsStub,
      list: async (options) => {
        received = options
        return listEnvelope([newest, older])
      }
    })

    const response = await server.inject(DASHBOARD_URL)

    expect(received).toMatchObject({
      page: 1,
      sort: 'arrivalDate,desc'
    })
    expect(received.referenceNumber).toBeUndefined()
    expect(response.result.indexOf(newest.journeyId)).toBeLessThan(
      response.result.indexOf(older.journeyId)
    )
    expect(response.result).toContain('Republic of Ireland')
    expect(response.result).toContain('7 March 2026')
  })

  it('defensively removes deleted rows', async () => {
    configureRecords(SET_ID, {
      ...recordsStub,
      list: async () =>
        listEnvelope([
          listedRow({ status: 'deleted', journeyId: 'DELETED-ROW' })
        ])
    })

    const response = await server.inject(DASHBOARD_URL)

    expect(response.result).not.toContain('DELETED-ROW')
    expect(response.result).toContain(copy.search.noResults)
  })

  it('shows the deletion banner only when deleted=1 is present', async () => {
    const ordinary = await server.inject(DASHBOARD_URL)
    const deleted = await server.inject('/plant-products?deleted=1')

    expect(ordinary.result).not.toContain(
      sharedCopy.notificationActions.delete.successTitle
    )
    expect(ordinary.result).not.toContain(
      sharedCopy.notificationActions.delete.successBody
    )
    expect(deleted.result).toContain(
      sharedCopy.notificationActions.delete.successTitle
    )
    expect(deleted.result).toContain(
      sharedCopy.notificationActions.delete.successBody
    )
  })
}

const searchAndFilterTests = () => {
  it('trims reference search for records.list and echoes it into the input', async () => {
    let received
    configureRecords(SET_ID, {
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
    configureRecords(SET_ID, {
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
    configureRecords(SET_ID, {
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
}

const createAmendAndFailureTests = () => {
  it('creates a journey and redirects to its plant import-type page', async () => {
    const response = await server.inject({
      method: 'POST',
      url: CREATE_URL
    })

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toMatch(
      /^\/plant-products\/notifications\/GBN-PP-[^/]+\/import-type$/
    )
  })

  it('POST amend transitions a submitted notification and redirects to its plant hub', async () => {
    const created = await server.inject({
      method: 'POST',
      url: CREATE_URL
    })
    const journeyId = created.headers.location.split('/')[3]
    const cookie = (created.headers['set-cookie'] ?? [])
      .map((value) => value.split(';')[0])
      .join('; ')
    await withSetContext(SET_ID, () => recordsStub.finalise(journeyId))

    const amended = await server.inject({
      method: 'POST',
      url: `/plant-products/notifications/${journeyId}/amend`,
      headers: { cookie }
    })

    expect(amended.statusCode).toBe(302)
    expect(amended.headers.location).toBe(
      withSetContext(SET_ID, () => hubPath(journeyId))
    )
    await expect(
      withSetContext(SET_ID, () => recordsStub.load({ journeyId }))
    ).resolves.toMatchObject({ status: 'amend' })
  })

  it('re-renders the dashboard at 500 for a recoverable create failure', async () => {
    configureRecords(SET_ID, {
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
      url: CREATE_URL
    })

    expect(response.statusCode).toBe(500)
    expect(response.result).toContain(copy.heading)
    expect(response.result).toContain(
      'Sorry, there is a problem with the service.'
    )
  })

  it('does not swallow an unexpected create error', async () => {
    configureRecords(SET_ID, {
      ...recordsStub,
      create: async () => {
        throw new TypeError('programming failure')
      }
    })

    const create = routes.find(({ path }) => path === createRoutePath())
    await expect(create.handler({ query: {}, app: {} }, {})).rejects.toThrow(
      'programming failure'
    )
  })

  it('surfaces records list and create failures', async () => {
    configureRecords(SET_ID, {
      ...recordsStub,
      list: async () => {
        throw new Error('list failed')
      },
      create: async () => {
        throw new Error('create failed')
      }
    })

    const listResponse = await server.inject(DASHBOARD_URL)
    const createResponse = await server.inject({
      method: 'POST',
      url: CREATE_URL
    })

    expect(listResponse.statusCode).toBe(500)
    expect(createResponse.statusCode).toBe(500)
  })
}

describe('plant-products dashboard controller', () => {
  setupDashboardServer()
  routeAndRenderTests()
  searchAndFilterTests()
  createAmendAndFailureTests()
})
